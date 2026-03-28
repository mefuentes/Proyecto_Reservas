import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  crearReservaAdmin,
  obtenerDisponibilidadPublica,
  obtenerClientePorDocumentoAdmin
} from '../services/adminApi';
import { obtenerCanchas, obtenerConfiguracion } from '../services/api';

function obtenerFechaHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

export default function AdminNuevaReserva() {
  const [fecha, setFecha] = useState(obtenerFechaHoy());
  const [canchas, setCanchas] = useState([]);
  const [duraciones, setDuraciones] = useState([60, 90, 120, 150, 180]);
  const [form, setForm] = useState({ cancha_id: '', hora_inicio: '', duracion_minutos: '60', documento_cliente: '', nombre_cliente: '', telefono_cliente: '', con_luz: false });
  const [horariosDisponiblesAdmin, setHorariosDisponiblesAdmin] = useState([]);
  const [cargandoHorariosAdmin, setCargandoHorariosAdmin] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [clienteAutocompletado, setClienteAutocompletado] = useState('');

  useEffect(() => {
    async function cargarInicial() {
      try {
        const [respCanchas, respConfig] = await Promise.all([obtenerCanchas(), obtenerConfiguracion()]);
        if (respCanchas.ok) setCanchas(respCanchas.data || []);
        if (respConfig.ok && respConfig.data?.duraciones_habilitadas) {
          const duracionesApi = respConfig.data.duraciones_habilitadas.split(',').map((d) => Number(d.trim())).filter(Boolean);
          if (duracionesApi.length) {
            setDuraciones(duracionesApi);
            setForm((prev) => ({ ...prev, duracion_minutos: String(duracionesApi[0]) }));
          }
        }
      } catch {
        setError('No se pudieron cargar los datos iniciales.');
      }
    }
    cargarInicial();
  }, []);

  useEffect(() => {
    async function autocompletar() {
      const documento = String(form.documento_cliente || '').replace(/\D/g, '');
      if (documento.length < 6) {
        if (clienteAutocompletado) {
          setForm((prev) => ({ ...prev, nombre_cliente: '', telefono_cliente: '' }));
          setClienteAutocompletado('');
        }
        return;
      }
      if (clienteAutocompletado && documento !== clienteAutocompletado) {
        setForm((prev) => ({ ...prev, nombre_cliente: '', telefono_cliente: '' }));
        setClienteAutocompletado('');
      }
      try {
        const resp = await obtenerClientePorDocumentoAdmin(documento);
        if (resp.ok && resp.data) {
          setForm((prev) => ({ ...prev, nombre_cliente: resp.data.nombre_apellido || '', telefono_cliente: resp.data.telefono || '' }));
          setClienteAutocompletado(documento);
        }
      } catch {}
    }
    autocompletar();
  }, [form.documento_cliente, clienteAutocompletado]);

  function handleChangeForm(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (['cancha_id', 'duracion_minutos'].includes(name)) {
      setHorariosDisponiblesAdmin([]);
      setForm((prev) => ({ ...prev, hora_inicio: '' }));
    }
  }

  async function consultarHorariosAdmin() {
    setError('');
    setInfo('');
    setHorariosDisponiblesAdmin([]);
    if (!form.cancha_id || !form.duracion_minutos || !fecha) {
      setError('Seleccioná fecha, cancha y duración para consultar horarios.');
      return;
    }
    try {
      setCargandoHorariosAdmin(true);
      const resp = await obtenerDisponibilidadPublica({ fecha, cancha_id: form.cancha_id, duracion: form.duracion_minutos });
      if (!resp.ok) return setError(resp.message || 'No se pudo consultar disponibilidad.');
      setHorariosDisponiblesAdmin(resp.data || []);
      if (!resp.data?.length) setInfo('No hay horarios disponibles para esa combinación.');
    } catch {
      setError('Ocurrió un error al consultar horarios.');
    } finally {
      setCargandoHorariosAdmin(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!form.cancha_id || !form.hora_inicio || !form.duracion_minutos || !form.documento_cliente.trim() || !form.nombre_cliente.trim()) {
      return setError('Debés completar documento, nombre y los demás datos obligatorios.');
    }
    try {
      setGuardando(true);
      const resp = await crearReservaAdmin({ ...form, cancha_id: Number(form.cancha_id), fecha, duracion_minutos: Number(form.duracion_minutos) });
      if (!resp.ok) return setError(resp.message || 'No se pudo crear la reserva.');
      setInfo('Reserva creada correctamente.');
      setForm((prev) => ({ ...prev, cancha_id: '', hora_inicio: '', documento_cliente: '', nombre_cliente: '', telefono_cliente: '', con_luz: false }));
      setHorariosDisponiblesAdmin([]);
      setClienteAutocompletado('');
    } catch {
      setError('Ocurrió un error al crear la reserva.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AdminLayout title="Nueva Reserva">
      <section className="card">
        <div className="section-header">
          <span className="section-badge">Operación</span>
          <h2>Cargar una nueva reserva manual</h2>
          <p>La anticipación mínima no se aplica al administrador.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Cancha</label>
              <select name="cancha_id" value={form.cancha_id} onChange={handleChangeForm}>
                <option value="">Seleccionar cancha</option>
                {canchas.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
                </select>
              </div>
            <div className="form-group">
              <label>Duración</label>
              <select name="duracion_minutos" value={form.duracion_minutos} onChange={handleChangeForm}>
                {duraciones.map((d) => <option key={d} value={d}>{d} minutos</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Documento</label>
              <input type="text" name="documento_cliente" value={form.documento_cliente} onChange={handleChangeForm} placeholder="Documento" />
            </div>
            <div className="form-group">
              <label>Nombre y apellido</label>
              <input type="text" name="nombre_cliente" value={form.nombre_cliente} onChange={handleChangeForm} placeholder="Nombre del cliente" />
            </div>
            <div className="form-group">
              <label>Teléfono (opcional)</label>
              <input type="text" name="telefono_cliente" value={form.telefono_cliente} onChange={handleChangeForm} placeholder="Teléfono" />
            </div>
            </div>
          <div className="form-group">
            <label>Horario disponible</label>
            <div className="inline-actions">
              <button type="button" className="secondary-btn" onClick={consultarHorariosAdmin} disabled={cargandoHorariosAdmin}>{cargandoHorariosAdmin ? 'Consultando...' : 'Consultar horarios'}</button>
            </div>
            {horariosDisponiblesAdmin.length > 0 && (
              <div className="horarios-grid admin-horarios-grid">
                {horariosDisponiblesAdmin.map((horario) => (
                  <button key={horario.hora_inicio} type="button" className={form.hora_inicio === horario.hora_inicio ? 'horario-btn activo' : 'horario-btn'} onClick={() => setForm((prev) => ({ ...prev, hora_inicio: horario.hora_inicio }))}>
                    <span className="horario-inicio">{horario.hora_inicio}</span>
                    <span className="horario-fin">a {horario.hora_fin}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="checkbox-line"><input type="checkbox" name="con_luz" checked={form.con_luz} onChange={handleChangeForm} /> Reservar con luz</label>
          <button className="primary-btn" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Crear reserva'}</button>
        </form>
        {info && <div className="info-box mt-16">{info}</div>}
        {error && <div className="error-box mt-16">{error}</div>}
      </section>
    </AdminLayout>
  );
}
