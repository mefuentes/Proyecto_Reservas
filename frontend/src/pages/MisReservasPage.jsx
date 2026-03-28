import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import { buscarMisReservas, cancelarMiReserva, obtenerConfiguracion, obtenerDisponibilidad, reprogramarMiReserva, obtenerTarifa, obtenerCanchas } from '../services/api';
import { formatCurrency } from '../utils/currency';

function obtenerFechaHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function esFechaHoraPasada(fecha, hora) {
  if (!fecha || !hora) return false;
  return new Date(`${fecha}T${hora}:00`).getTime() < Date.now();
}

export default function MisReservasPage() {
  const reprogramacionRef = useRef(null);
  const [documento, setDocumento] = useState('');
  const [fecha, setFecha] = useState('');
  const [reservas, setReservas] = useState([]);
  const [horasCancelacion, setHorasCancelacion] = useState(3);
  const [horasReprogramacion, setHorasReprogramacion] = useState(3);
  const [canchas, setCanchas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [reprogramacion, setReprogramacion] = useState({ nueva_fecha: '', nueva_cancha_id: '', nueva_duracion_minutos: '60', con_luz: false, nueva_hora_inicio: '' });
  const [horarios, setHorarios] = useState([]);
  const [tarifa, setTarifa] = useState({ precio_total: 0 });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        const [configResp, canchasResp] = await Promise.all([obtenerConfiguracion(), obtenerCanchas()]);
        if (configResp.ok && configResp.data) {
          setHorasCancelacion(
            configResp.data.horas_minimas_cancelacion_cliente ?? Math.max(Math.ceil(Number(configResp.data.minutos_minimos_cancelacion_cliente || 180) / 60), 0)
          );
          setHorasReprogramacion(
            configResp.data.horas_minimas_reprogramacion_cliente ?? configResp.data.horas_minimas_cancelacion_cliente ?? Math.max(Math.ceil(Number(configResp.data.minutos_minimos_cancelacion_cliente || 180) / 60), 0)
          );
        }
        if (canchasResp.ok) setCanchas(canchasResp.data || []);
      } catch {}
    }
    cargarConfiguracion();
  }, []);

  useEffect(() => {
    // Limpiar reprogramación cuando cambia la fecha de búsqueda
    setEditandoId(null);
    setReprogramacion({ nueva_fecha: '', nueva_cancha_id: '', nueva_duracion_minutos: '60', con_luz: false, nueva_hora_inicio: '' });
    setHorarios([]);
  }, [fecha]);

  useEffect(() => {
    async function cargarTarifa() {
      if (!reprogramacion.nueva_cancha_id || !reprogramacion.nueva_duracion_minutos) return;
      const resp = await obtenerTarifa({ cancha_id: reprogramacion.nueva_cancha_id, duracion: reprogramacion.nueva_duracion_minutos, con_luz: reprogramacion.con_luz });
      if (resp.ok) setTarifa(resp.data || { precio_total: 0 });
    }
    cargarTarifa();
  }, [reprogramacion.nueva_cancha_id, reprogramacion.nueva_duracion_minutos, reprogramacion.con_luz]);

  async function handleBuscar(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setReservas([]);
    setEditandoId(null); // Limpiar estado de reprogramación
    setReprogramacion({ nueva_fecha: '', nueva_cancha_id: '', nueva_duracion_minutos: '60', con_luz: false, nueva_hora_inicio: '' });
    setHorarios([]);
    if (!documento.trim() || !fecha) return setError('Debes completar documento y fecha.');
    try {
      setCargando(true);
      const resp = await buscarMisReservas({ documento: documento.trim(), fecha });
      if (!resp.ok) return setError(resp.message || 'No se pudieron obtener las reservas.');
      setReservas(resp.data || []);
      if (!resp.data || resp.data.length === 0) setInfo('No se encontraron reservas para los datos ingresados.');
    } catch {
      setError('Ocurrio un error al buscar las reservas.');
    } finally {
      setCargando(false);
    }
  }

  async function handleCancelar(id) {
    if (!window.confirm('Quieres cancelar esta reserva?')) return;
    setError('');
    setInfo('');
    try {
      const resp = await cancelarMiReserva(id, documento.trim());
      if (!resp.ok) return setError(resp.message || 'No se pudo cancelar la reserva.');
      setInfo('Reserva cancelada correctamente.');
      setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, estado: 'cancelada' } : r)));
    } catch {
      setError('Ocurrio un error al cancelar la reserva.');
    }
  }

  function iniciarReprogramacion(reserva) {
    setEditandoId(reserva.id);
    setReprogramacion({ nueva_fecha: reserva.fecha, nueva_cancha_id: String(reserva.cancha_id), nueva_duracion_minutos: String(reserva.duracion_minutos), con_luz: Boolean(reserva.con_luz), nueva_hora_inicio: '' });
    setHorarios([]);
    setError('');
    setInfo('');
    // Scroll a la sección de reprogramación
    setTimeout(() => reprogramacionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  async function consultarHorarios() {
    setError('');
    setInfo('');
    setHorarios([]);
    if (!reprogramacion.nueva_fecha || !reprogramacion.nueva_cancha_id || !reprogramacion.nueva_duracion_minutos) return setError('Completa fecha, cancha y duracion.');
    try {
      const resp = await obtenerDisponibilidad({ fecha: reprogramacion.nueva_fecha, cancha_id: reprogramacion.nueva_cancha_id, duracion: reprogramacion.nueva_duracion_minutos });
      if (!resp.ok) return setError(resp.message || 'No se pudo consultar disponibilidad.');
      setHorarios(resp.data || []);
      if (!resp.data || resp.data.length === 0) setInfo('No hay horarios disponibles para la nueva seleccion.');
      else {
        // Scroll a la sección de horarios si hay resultados
        setTimeout(() => {
          const horariosElement = document.querySelector('.horarios-grid');
          if (horariosElement) {
            horariosElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch {
      setError('Ocurrio un error al consultar disponibilidad.');
    }
  }

  async function confirmarReprogramacion() {
    setError('');
    setInfo('');
    if (!editandoId || !reprogramacion.nueva_hora_inicio) return setError('Selecciona un horario nuevo.');
    if (esFechaHoraPasada(reprogramacion.nueva_fecha, reprogramacion.nueva_hora_inicio)) return setError('No podes reprogramar a una fecha u horario anterior al actual.');
    try {
      const resp = await reprogramarMiReserva(editandoId, { documento: documento.trim(), ...reprogramacion, nueva_cancha_id: Number(reprogramacion.nueva_cancha_id), nueva_duracion_minutos: Number(reprogramacion.nueva_duracion_minutos) });
      if (!resp.ok) return setError(resp.message || 'No se pudo reprogramar la reserva.');
      setInfo('Reserva reprogramada correctamente.');
      setEditandoId(null);
      setHorarios([]);
      handleBuscar({ preventDefault() {} });
    } catch {
      setError('Ocurrio un error al reprogramar la reserva.');
    }
  }

  const canchaNueva = useMemo(() => canchas.find((c) => String(c.id) === String(reprogramacion.nueva_cancha_id)), [canchas, reprogramacion.nueva_cancha_id]);
  const puedeConsultarHorarios = reprogramacion.nueva_fecha && reprogramacion.nueva_cancha_id && reprogramacion.nueva_duracion_minutos;

  return (
    <div>
      <Header />
      <main className="container">
        <section className="page-intro">
          <span className="section-badge">Mis reservas</span>
          <h2>Consultar, cancelar y reprogramar</h2>
          <p>La cancelacion requiere al menos {horasCancelacion} horas de anticipacion y la reprogramacion al menos {horasReprogramacion} horas.</p>
        </section>
        <section className="card">
          <form onSubmit={handleBuscar}>
            <div className="form-grid two-cols">
              <div className="form-group"><label>Numero de documento</label><input type="text" value={documento} onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))} placeholder="Ingresa tu documento" /></div>
              <div className="form-group"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            </div>
            <button className="primary-btn" type="submit" disabled={cargando}>{cargando ? 'Buscando...' : 'Buscar reservas'}</button>
          </form>
          {info && <div className="info-box mt-16">{info}</div>}
          {error && <div className="error-box mt-16">{error}</div>}
        </section>
        <section className="card">
          <h2>Resultados</h2>
          {reservas.length > 0 ? (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Cancha</th><th>Fecha</th><th>Horario</th><th>Modalidad</th><th>Total</th><th>Estado</th><th>Accion</th></tr></thead>
                <tbody>
                  {reservas.map((reserva) => {
                    const reservaPasada = esFechaHoraPasada(reserva.fecha, reserva.hora_inicio);
                    const puedeCancelar = !reservaPasada && faltanMasDeHoras(reserva.fecha, reserva.hora_inicio, horasCancelacion);
                    const puedeReprogramar = !reservaPasada && faltanMasDeHoras(reserva.fecha, reserva.hora_inicio, horasReprogramacion);
                    return (
                      <tr key={reserva.id}>
                        <td>{reserva.cancha_nombre}</td>
                        <td>{reserva.fecha}</td>
                        <td>{reserva.hora_inicio} a {reserva.hora_fin}</td>
                        <td>{reserva.con_luz ? 'Con luz' : 'Sin luz'}</td>
                        <td>{formatCurrency(reserva.precio_total)}</td>
                        <td><span className={reserva.estado === 'confirmada' ? 'status-badge status-ok' : 'status-badge status-cancelled'}>{reserva.estado}</span></td>
                        <td>{reserva.estado === 'confirmada' && (puedeCancelar || puedeReprogramar) ? <div className="table-actions">{puedeCancelar ? <button className="danger-btn small-btn" onClick={() => handleCancelar(reserva.id)}>Cancelar</button> : null}{puedeReprogramar ? <button className="secondary-btn small-btn" onClick={() => iniciarReprogramacion(reserva)}>Reprogramar</button> : null}</div> : <span className="muted-text">Sin accion</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state"><p>No hay reservas para mostrar.</p></div>}
        </section>
        {editandoId && (
          <div ref={reprogramacionRef}>
            <section className="card">
              <h2>Reprogramar reserva</h2>
            <div className="form-grid">
              <div className="form-group"><label>Nueva fecha</label><input type="date" min={obtenerFechaHoy()} value={reprogramacion.nueva_fecha} onChange={(e) => setReprogramacion((p) => ({ ...p, nueva_fecha: e.target.value, nueva_hora_inicio: '' }))} /></div>
              <div className="form-group"><label>Nueva cancha</label><select value={reprogramacion.nueva_cancha_id} onChange={(e) => setReprogramacion((p) => ({ ...p, nueva_cancha_id: e.target.value }))}><option value="">Seleccionar cancha</option>{canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
              <div className="form-group"><label>Nueva duracion</label><select value={reprogramacion.nueva_duracion_minutos} onChange={(e) => setReprogramacion((p) => ({ ...p, nueva_duracion_minutos: e.target.value }))}>{[60, 90, 120, 150, 180].map((d) => <option key={d} value={d}>{d} minutos</option>)}</select></div>
            </div>
            <label className="checkbox-line"><input type="checkbox" checked={reprogramacion.con_luz} onChange={(e) => setReprogramacion((p) => ({ ...p, con_luz: e.target.checked }))} /> Reprogramar con luz</label>
            <div className="summary-panel compact-panel"><div className="summary-row"><span>Cancha</span><strong>{canchaNueva?.nombre || '-'}</strong></div><div className="summary-row"><span>Total estimado</span><strong>{formatCurrency(tarifa.precio_total)}</strong></div></div>
            <div className="admin-actions"><button type="button" className={puedeConsultarHorarios ? 'primary-btn' : 'secondary-btn'} onClick={consultarHorarios} disabled={!puedeConsultarHorarios}>Consultar horarios</button><button type="button" className="secondary-btn" onClick={() => { setEditandoId(null); setHorarios([]); }}>Cancelar</button></div>
            {horarios.length > 0 && <div className="horarios-grid admin-horarios-grid">{horarios.map((h) => <button key={h.hora_inicio} type="button" className={reprogramacion.nueva_hora_inicio === h.hora_inicio ? 'horario-btn activo' : 'horario-btn'} onClick={() => setReprogramacion((p) => ({ ...p, nueva_hora_inicio: h.hora_inicio }))}><span className="horario-inicio">{h.hora_inicio}</span><span className="horario-fin">a {h.hora_fin}</span></button>)}</div>}
            {reprogramacion.nueva_hora_inicio && <button type="button" className="primary-btn mt-16" onClick={confirmarReprogramacion}>Confirmar reprogramacion</button>}
          </section>
          </div>
        )}
      </main>
    </div>
  );
}
  function faltanMasDeHoras(fechaReserva, horaReserva, horas) {
    return new Date(`${fechaReserva}T${horaReserva}:00`).getTime() - Date.now() > Number(horas || 0) * 60 * 60 * 1000;
  }
