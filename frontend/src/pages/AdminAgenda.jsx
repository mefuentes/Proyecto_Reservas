import { useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { obtenerAgenda, cancelarReserva, obtenerCanchasAdmin, obtenerDisponibilidadPublica, reprogramarReservaAdmin } from '../services/adminApi';
import { formatCurrency } from '../utils/currency';

function obtenerFechaHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function esFechaHoraPasada(fecha, hora) {
  if (!fecha || !hora) return false;
  return new Date(`${fecha}T${hora}:00`).getTime() < Date.now();
}

function obtenerNumeroCancha(nombre) {
  const match = String(nombre || '').match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export default function AdminAgenda() {
  const reprogramacionRef = useRef(null);
  const [fecha, setFecha] = useState(obtenerFechaHoy());
  const [canchaIdFiltro, setCanchaIdFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [canchas, setCanchas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [reprogramacion, setReprogramacion] = useState({ nueva_fecha: obtenerFechaHoy(), nueva_cancha_id: '', nueva_duracion_minutos: '60', nueva_hora_inicio: '', con_luz: false });
  const [horarios, setHorarios] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cargando, setCargando] = useState(false);

  async function cargarCanchas() {
    const resp = await obtenerCanchasAdmin();
    if (resp.ok) setCanchas(resp.data || []);
  }

  async function cargarAgenda() {
    setError('');
    setInfo('');
    try {
      setCargando(true);
      const resp = await obtenerAgenda(fecha, canchaIdFiltro, estadoFiltro);
      if (!resp.ok) return setError(resp.message || 'No se pudo cargar la agenda.');
      setReservas(resp.data || []);
      if (!(resp.data || []).length) setInfo('No hay reservas para la seleccion actual.');
    } catch {
      setError('Ocurrio un error al obtener la agenda.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarCanchas(); }, []);
  useEffect(() => { cargarAgenda(); }, [fecha, canchaIdFiltro, estadoFiltro]);
  useEffect(() => {
    if (editandoId && reprogramacionRef.current) {
      reprogramacionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editandoId]);

  function reservaAdministrable(fechaReserva, horaReserva) {
    // El admin puede gestionar cualquier reserva futura sin restricciones de tiempo mínimo
    // A diferencia del cliente, no se aplica el parámetro "Tiempo mínimo para reprogramar"
    return new Date(`${fechaReserva}T${horaReserva}:00`).getTime() > Date.now();
  }

  const metricas = useMemo(() => {
    const confirmadas = reservas.filter((r) => r.estado === 'confirmada').length;
    const canceladas = reservas.filter((r) => r.estado === 'cancelada').length;
    const totalMinutos = reservas.filter((r) => r.estado === 'confirmada').reduce((acc, r) => acc + Number(r.duracion_minutos || 0), 0);
    const ingresos = reservas.filter((r) => r.estado === 'confirmada').reduce((acc, r) => acc + Number(r.precio_total || 0), 0);
    return { total: reservas.length, confirmadas, canceladas, horasReservadas: (totalMinutos / 60).toFixed(1), ingresos };
  }, [reservas]);

  const reservasOrdenadas = useMemo(() => {
    return [...reservas].sort((a, b) => {
      const horario = String(a.hora_inicio).localeCompare(String(b.hora_inicio));
      if (horario !== 0) return horario;

      const numeroCancha = obtenerNumeroCancha(a.cancha_nombre) - obtenerNumeroCancha(b.cancha_nombre);
      if (numeroCancha !== 0) return numeroCancha;

      return String(a.cancha_nombre || '').localeCompare(String(b.cancha_nombre || ''));
    });
  }, [reservas]);

  async function handleCancelar(id) {
    if (!window.confirm('Quieres cancelar esta reserva?')) return;
    const resp = await cancelarReserva(id);
    if (!resp.ok) setError(resp.message || 'No se pudo cancelar la reserva.');
    else {
      setInfo('Reserva cancelada correctamente.');
      cargarAgenda();
    }
  }

  function iniciarReprogramacion(reserva) {
    setEditandoId(reserva.id);
    setReprogramacion({
      nueva_fecha: reserva.fecha,
      nueva_cancha_id: String(reserva.cancha_id),
      nueva_duracion_minutos: String(reserva.duracion_minutos),
      nueva_hora_inicio: '',
      con_luz: Boolean(reserva.con_luz)
    });
    setHorarios([]);
    setError('');
    setInfo('');
  }

  async function consultarHorarios() {
    setError('');
    setInfo('');
    setHorarios([]);
    if (!reprogramacion.nueva_fecha || !reprogramacion.nueva_cancha_id || !reprogramacion.nueva_duracion_minutos) return setError('Completa fecha, cancha y duracion.');
    try {
      const resp = await obtenerDisponibilidadPublica({ fecha: reprogramacion.nueva_fecha, cancha_id: reprogramacion.nueva_cancha_id, duracion: reprogramacion.nueva_duracion_minutos });
      if (!resp.ok) return setError(resp.message || 'No se pudo consultar disponibilidad.');
      setHorarios(resp.data || []);
      if (!resp.data || resp.data.length === 0) setInfo('No hay horarios disponibles para la nueva seleccion.');
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
      const resp = await reprogramarReservaAdmin(editandoId, {
        ...reprogramacion,
        nueva_cancha_id: Number(reprogramacion.nueva_cancha_id),
        nueva_duracion_minutos: Number(reprogramacion.nueva_duracion_minutos)
      });
      if (!resp.ok) return setError(resp.message || 'No se pudo reprogramar la reserva.');
      setInfo('Reserva reprogramada correctamente.');
      setEditandoId(null);
      setHorarios([]);
      cargarAgenda();
    } catch {
      setError('Ocurrio un error al reprogramar la reserva.');
    }
  }

  return (
    <AdminLayout title="Agenda diaria">
      <section className="metrics-grid">
        <article className="metric-card"><span>Total reservas</span><strong>{metricas.total}</strong></article>
        <article className="metric-card"><span>Confirmadas</span><strong>{metricas.confirmadas}</strong></article>
        <article className="metric-card"><span>Canceladas</span><strong>{metricas.canceladas}</strong></article>
        <article className="metric-card"><span>Horas reservadas</span><strong>{metricas.horasReservadas}</strong></article>
        <article className="metric-card"><span>Ingresos</span><strong>{formatCurrency(metricas.ingresos)}</strong></article>
      </section>

      <section className="card">
        <div className="admin-toolbar">
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Cancha</label>
            <select value={canchaIdFiltro} onChange={(e) => setCanchaIdFiltro(e.target.value)}>
              <option value="">Todas las canchas</option>
              {canchas.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
              <option value="reprogramada">Reprogramada</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        {cargando ? (
          <div className="empty-state"><p>Cargando agenda...</p></div>
        ) : reservas.length > 0 ? (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cancha</th><th>Horario</th><th>Duracion</th><th>Cliente</th><th>Documento</th><th>Telefono</th><th>Estado</th><th>Origen</th><th>Cancelado por</th><th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {reservasOrdenadas.map((reserva) => {
                  const puedeCancelar = reservaAdministrable(reserva.fecha, reserva.hora_inicio);
                  const puedeReprogramar = reservaAdministrable(reserva.fecha, reserva.hora_inicio);
                  return (
                    <tr key={reserva.id}>
                      <td>{reserva.cancha_nombre}</td>
                      <td>{reserva.hora_inicio} a {reserva.hora_fin}</td>
                      <td>{reserva.duracion_minutos} min</td>
                      <td>{reserva.nombre_cliente}</td>
                      <td>{reserva.documento_cliente || '-'}</td>
                      <td>{reserva.telefono_cliente || '-'}</td>
                      <td><span className={reserva.estado === 'confirmada' ? 'status-badge status-ok' : 'status-badge status-cancelled'}>{reserva.estado}</span></td>
                      <td>{reserva.origen}</td>
                      <td>{reserva.estado === 'cancelada' ? (reserva.cancelado_por_nombre ? `${reserva.cancelado_por_nombre} (${reserva.cancelado_por_tipo || 'sin dato'})` : (reserva.cancelado_por_tipo || '-')) : '-'}</td>
                      <td>{reserva.estado === 'confirmada' && (puedeReprogramar || puedeCancelar) ? <div className="table-actions">{puedeReprogramar ? <button className="secondary-btn small-btn" onClick={() => iniciarReprogramacion(reserva)}>Reprogramar</button> : null}{puedeCancelar ? <button className="danger-btn small-btn" onClick={() => handleCancelar(reserva.id)}>Cancelar</button> : null}</div> : <span className="muted-text">Sin accion</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><p>No hay reservas para mostrar.</p></div>
        )}
        {info && <div className="info-box mt-16">{info}</div>}
        {error && <div className="error-box mt-16">{error}</div>}
      </section>

      {editandoId && (
        <section className="card" ref={reprogramacionRef}>
          <h2>Reprogramar reserva</h2>
          <div className="form-grid">
            <div className="form-group"><label>Nueva fecha</label><input type="date" min={obtenerFechaHoy()} value={reprogramacion.nueva_fecha} onChange={(e) => setReprogramacion((prev) => ({ ...prev, nueva_fecha: e.target.value, nueva_hora_inicio: '' }))} /></div>
            <div className="form-group"><label>Nueva cancha</label><select value={reprogramacion.nueva_cancha_id} onChange={(e) => setReprogramacion((prev) => ({ ...prev, nueva_cancha_id: e.target.value, nueva_hora_inicio: '' }))}><option value="">Seleccionar cancha</option>{canchas.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}</select></div>
            <div className="form-group"><label>Nueva duracion</label><select value={reprogramacion.nueva_duracion_minutos} onChange={(e) => setReprogramacion((prev) => ({ ...prev, nueva_duracion_minutos: e.target.value, nueva_hora_inicio: '' }))}>{[60, 90, 120, 150, 180].map((d) => <option key={d} value={d}>{d} minutos</option>)}</select></div>
          </div>
          <label className="checkbox-line"><input type="checkbox" checked={reprogramacion.con_luz} onChange={(e) => setReprogramacion((prev) => ({ ...prev, con_luz: e.target.checked }))} /> Reprogramar con luz</label>
          <div className="admin-actions"><button type="button" className="secondary-btn" onClick={consultarHorarios}>Consultar horarios</button><button type="button" className="secondary-btn" onClick={() => { setEditandoId(null); setHorarios([]); }}>Cancelar</button></div>
          {horarios.length > 0 && <div className="horarios-grid admin-horarios-grid">{horarios.map((h) => <button key={h.hora_inicio} type="button" className={reprogramacion.nueva_hora_inicio === h.hora_inicio ? 'horario-btn activo' : 'horario-btn'} onClick={() => setReprogramacion((prev) => ({ ...prev, nueva_hora_inicio: h.hora_inicio }))}><span className="horario-inicio">{h.hora_inicio}</span><span className="horario-fin">a {h.hora_fin}</span></button>)}</div>}
          {reprogramacion.nueva_hora_inicio && <button type="button" className="primary-btn mt-16" onClick={confirmarReprogramacion}>Confirmar reprogramacion</button>}
        </section>
      )}
    </AdminLayout>
  );
}
