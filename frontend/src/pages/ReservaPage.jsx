import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SelectorReserva from '../components/SelectorReserva';
import ListaHorarios from '../components/ListaHorarios';
import ResumenReserva from '../components/ResumenReserva';
import { obtenerCanchas, obtenerConfiguracion, obtenerDisponibilidad, obtenerTarifa, crearReserva, obtenerClientePorDocumento } from '../services/api';
import { formatCurrency } from '../utils/currency';

function obtenerFechaHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function esNombreValido(nombre) { return nombre.trim().length >= 3; }
function normalizarTelefono(valor) { return valor.replace(/[^\d+]/g, ''); }
function esTelefonoValido(telefono) { if (!telefono.trim()) return true; const limpio = telefono.replace(/\D/g, ''); return limpio.length >= 8 && limpio.length <= 15; }
function esDocumentoValido(documento) { return String(documento).replace(/\D/g, '').length >= 6; }

export default function ReservaPage() {
  const navigate = useNavigate();
  const horariosRef = useRef(null);
  const resumenRef = useRef(null);
  const [canchas, setCanchas] = useState([]);
  const [duraciones, setDuraciones] = useState([60, 90, 120, 150, 180]);
  const [configuracion, setConfiguracion] = useState({ anticipacion_minima: 0 });
  const [fecha, setFecha] = useState(obtenerFechaHoy());
  const [canchaId, setCanchaId] = useState('');
  const [duracion, setDuracion] = useState('');
  const [conLuz, setConLuz] = useState(false);
  const [tarifa, setTarifa] = useState({ precio_base: 0, adicional_luz: 0, precio_total: 0 });
  const [horarios, setHorarios] = useState([]);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState('');
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [clienteExistente, setClienteExistente] = useState(false);
  const [documentoAutocompletado, setDocumentoAutocompletado] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [cargandoReserva, setCargandoReserva] = useState(false);

  useEffect(() => {
    async function cargarDatosIniciales() {
      try {
        setCargandoInicial(true);
        const [canchasResp, configResp] = await Promise.all([obtenerCanchas(), obtenerConfiguracion()]);
        if (canchasResp.ok) setCanchas(canchasResp.data || []);
        if (configResp.ok && configResp.data) {
          setConfiguracion(configResp.data);
        }
        if (configResp.ok && configResp.data?.duraciones_habilitadas) {
          const duracionesApi = configResp.data.duraciones_habilitadas.split(',').map((d) => Number(d.trim())).filter(Boolean);
          if (duracionesApi.length > 0) setDuraciones(duracionesApi);
        }
      } catch {
        setError('No se pudieron cargar los datos iniciales.');
      } finally {
        setCargandoInicial(false);
      }
    }
    cargarDatosIniciales();
  }, []);

  useEffect(() => { setHorarios([]); setHorarioSeleccionado(''); setBusquedaRealizada(false); setInfo(''); }, [fecha, canchaId, duracion]);

  useEffect(() => {
    async function cargarTarifa() {
      if (!canchaId || !duracion) { setTarifa({ precio_base: 0, adicional_luz: 0, precio_total: 0 }); return; }
      try {
        const resp = await obtenerTarifa({ cancha_id: canchaId, duracion, con_luz: conLuz });
        if (resp.ok) setTarifa(resp.data || { precio_base: 0, adicional_luz: 0, precio_total: 0 });
      } catch {}
    }
    cargarTarifa();
  }, [canchaId, duracion, conLuz]);

  useEffect(() => {
    async function buscarCliente() {
      const documentoNormalizado = String(documento || '').replace(/\D/g, '');

      if (!esDocumentoValido(documentoNormalizado)) {
        if (documentoAutocompletado) {
          setNombre('');
          setTelefono('');
          setDocumentoAutocompletado('');
        }
        setClienteExistente(false);
        return;
      }

      if (documentoAutocompletado && documentoNormalizado !== documentoAutocompletado) {
        setNombre('');
        setTelefono('');
        setClienteExistente(false);
        setDocumentoAutocompletado('');
      }

      try {
        const resp = await obtenerClientePorDocumento(documentoNormalizado);
        if (resp.ok && resp.data) {
          setNombre(resp.data.nombre_apellido || '');
          setTelefono(resp.data.telefono || '');
          setClienteExistente(true);
          setDocumentoAutocompletado(documentoNormalizado);
        } else {
          setClienteExistente(false);
          setDocumentoAutocompletado('');
          setNombre('');
          setTelefono('');
        }
      } catch {
        setClienteExistente(false);
      }
    }
    buscarCliente();
  }, [documento, documentoAutocompletado]);

  useEffect(() => {
    if (horarioSeleccionado && resumenRef.current) {
      // Scroll a la sección de resumen cuando se selecciona un horario
      setTimeout(() => resumenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [horarioSeleccionado]);
  const canchaSeleccionada = useMemo(
  () => canchas.find((c) => String(c.id) === String(canchaId)),
  [canchas, canchaId]
);
  const horarioCompletoSeleccionado = useMemo(() => horarios.find((h) => h.hora_inicio === horarioSeleccionado), [horarios, horarioSeleccionado]);
  const formularioValido = esDocumentoValido(documento) && esNombreValido(nombre) && esTelefonoValido(telefono) && !!horarioSeleccionado;

  function construirFechaReserva(fechaReserva, horaInicio, horaApertura, horaCierre) {
    const fecha = new Date(`${fechaReserva}T${horaInicio}:00`);
    if (horaApertura && horaCierre && horaCierre <= horaApertura && horaInicio < horaApertura) {
      fecha.setDate(fecha.getDate() + 1);
    }
    return fecha;
  }

  async function buscarDisponibilidad() {
    setError(''); setInfo(''); setHorarios([]); setHorarioSeleccionado(''); setBusquedaRealizada(false);
    if (!fecha || !canchaId || !duracion) { setError('Debes completar fecha, cancha y duracion.'); return; }
    try {
      setCargandoBusqueda(true);
      const resp = await obtenerDisponibilidad({ fecha, cancha_id: canchaId, duracion, aplicar_anticipacion: true });
      if (!resp.ok) { setError(resp.message || 'No se pudo obtener disponibilidad.'); return; }
      setHorarios(resp.data || []); setBusquedaRealizada(true);
      if (!resp.data || resp.data.length === 0) setInfo('No hay turnos libres para esa seleccion.');
      // Scroll a la sección de horarios
      setTimeout(() => horariosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch { setError('Ocurrio un error al consultar disponibilidad.'); } finally { setCargandoBusqueda(false); }
  }

  async function confirmarReserva() {
    setError(''); setInfo('');
    if (!horarioSeleccionado) return setError('Debes seleccionar un horario.');
    if (!esDocumentoValido(documento)) return setError('Ingresa un numero de documento valido.');
    if (!esNombreValido(nombre)) return setError('El nombre debe tener al menos 3 caracteres.');
    if (Number(configuracion?.anticipacion_minima || 0) > 0 && horarioCompletoSeleccionado) {
      const reservaFecha = construirFechaReserva(fecha, horarioCompletoSeleccionado.hora_inicio, canchaSeleccionada?.hora_apertura || configuracion.hora_apertura, canchaSeleccionada?.hora_cierre || configuracion.hora_cierre);
      const diffMin = (reservaFecha.getTime() - Date.now()) / (1000 * 60);
      if (diffMin < Number(configuracion.anticipacion_minima)) {
        return setError(`No es posible reservar ese turno porque el club exige una anticipacion minima de ${configuracion.anticipacion_minima} minutos.`);
      }
    }
    if (!esTelefonoValido(telefono)) return setError('Ingresa un telefono valido o dejalo vacio.');
    try {
      setCargandoReserva(true);
      const resp = await crearReserva({ cancha_id: Number(canchaId), fecha, hora_inicio: horarioSeleccionado, duracion_minutos: Number(duracion), documento_cliente: documento, nombre_cliente: nombre, telefono_cliente: normalizarTelefono(telefono), con_luz: conLuz });
      if (!resp.ok) { setError(resp.message || 'No se pudo crear la reserva.'); return; }
      navigate('/confirmacion', { state: { reserva: resp.data, canchaNombre: canchaSeleccionada?.nombre || '' } });
    } catch { setError('Ocurrio un error al confirmar la reserva.'); } finally { setCargandoReserva(false); }
  }

  return (
    <div>
      <Header />
      <main className="container reserva-layout">
        <section className="page-intro">
          <span className="section-badge">Reserva online</span>
          <h2>Elegi tu cancha y horario</h2>
          <p>Consulta disponibilidad en tiempo real y confirma tu turno de forma inmediata.</p>
          {Number(configuracion?.anticipacion_minima || 0) > 0 && <p className="muted-note">La reserva online requiere al menos {configuracion.anticipacion_minima} minutos de anticipacion.</p>}
        </section>
        {cargandoInicial ? (
          <section className="card"><div className="empty-state"><p>Cargando informacion inicial...</p></div></section>
        ) : (
          <>
            <SelectorReserva fecha={fecha} setFecha={setFecha} canchaId={canchaId} setCanchaId={setCanchaId} duracion={duracion} setDuracion={setDuracion} canchas={canchas} duraciones={duraciones} onBuscar={buscarDisponibilidad} cargando={cargandoBusqueda} fechaMinima={obtenerFechaHoy()} />
            <div ref={horariosRef}>
              <ListaHorarios horarios={horarios} horarioSeleccionado={horarioSeleccionado} setHorarioSeleccionado={setHorarioSeleccionado} busquedaRealizada={busquedaRealizada} cargando={cargandoBusqueda} />
            </div>
            {horarioSeleccionado && <div ref={resumenRef}>
              <ResumenReserva documento={documento} setDocumento={setDocumento} nombre={nombre} setNombre={(v) => setNombre(v.toUpperCase())} telefono={telefono} setTelefono={(valor) => setTelefono(normalizarTelefono(valor))} fecha={fecha} canchaNombre={canchaSeleccionada?.nombre || ''} duracion={duracion} horarioSeleccionado={horarioSeleccionado} horaFinSeleccionada={horarioCompletoSeleccionado?.hora_fin || ''} onConfirmar={confirmarReserva} cargando={cargandoReserva} formularioValido={formularioValido} bloqueadoNombre={clienteExistente} extraResumen={<><div className="summary-row"><span>Modalidad</span><strong>{conLuz ? 'Con luz' : 'Sin luz'}</strong></div><div className="summary-row"><span>Precio base</span><strong>{formatCurrency(tarifa.precio_base)}</strong></div><div className="summary-row"><span>Adicional luz</span><strong>{formatCurrency(tarifa.adicional_luz)}</strong></div><div className="summary-row"><span>Total</span><strong>{formatCurrency(tarifa.precio_total)}</strong></div></>} extraActions={<label className="checkbox-line inline-checkbox"><input type="checkbox" checked={conLuz} onChange={(e) => setConLuz(e.target.checked)} /> Reservar con luz</label>} />
            </div>}
            {clienteExistente && <div className="info-box">Cliente encontrado. Se completaron los datos automaticamente.</div>}
            {info && <div className="info-box">{info}</div>}
            {error && <div className="error-box">{error}</div>}
          </>
        )}
      </main>
    </div>
  );
}
