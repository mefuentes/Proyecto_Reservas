import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { obtenerAgenda, obtenerBloqueos, obtenerCanchasAdmin } from '../services/adminApi';
import { formatCurrency } from '../utils/currency';

function obtenerFechaHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function formatearFechaLarga(fecha) {
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
}

function obtenerInicioReserva(fecha, horaInicio) {
  const inicio = new Date(`${fecha}T${horaInicio}`);
  return Number.isFinite(inicio.getTime()) ? inicio : null;
}

export default function AdminDashboard() {
  const [fecha] = useState(obtenerFechaHoy());
  const [reservas, setReservas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const [agendaResp, bloqueosResp, canchasResp] = await Promise.all([
          obtenerAgenda(fecha),
          obtenerBloqueos(fecha),
          obtenerCanchasAdmin()
        ]);
        if (agendaResp.ok) setReservas(agendaResp.data || []);
        if (bloqueosResp.ok) setBloqueos(bloqueosResp.data || []);
        if (canchasResp.ok) setCanchas(canchasResp.data || []);
      } catch {
        setError('No se pudo cargar el dashboard.');
      } finally {
        setCargando(false);
      }
    })();
  }, [fecha]);

  const resumen = useMemo(() => {
    const confirmadas = reservas.filter((r) => r.estado === 'confirmada');
    const canceladas = reservas.filter((r) => r.estado === 'cancelada').length;
    const activas = canchas.filter((c) => c.activa).length;
    const ingresos = confirmadas.reduce((acc, r) => acc + Number(r.precio_total || 0), 0);
    
    // Obtener la hora actual en formato HH:MM para comparar con hora_inicio
    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    // Filtrar solo las reservas futuras (posterior a la hora actual)
    const proximas = confirmadas
      .filter((r) => r.hora_inicio > horaActual)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

    const ticketPromedio = confirmadas.length > 0 ? ingresos / confirmadas.length : 0;

    const porCancha = canchas
      .map((cancha) => {
        const reservasCancha = confirmadas.filter((r) => r.cancha_id === cancha.id);
        return {
          cancha: cancha.nombre,
          total: reservasCancha.length,
          ingresos: reservasCancha.reduce((acc, r) => acc + Number(r.precio_total || 0), 0)
        };
      })
      .sort((a, b) => b.total - a.total);

    // Obtener el primer horario futuro (próximo turno)
    const proximoHorario = proximas[0]?.hora_inicio || '';
    const siguientesReservas = proximoHorario
      ? proximas.filter((r) => r.hora_inicio === proximoHorario)
      : [];

    return {
      totalReservas: reservas.length,
      confirmadas: confirmadas.length,
      canceladas,
      bloqueos: bloqueos.length,
      activas,
      ingresos,
      ticketPromedio,
      proximas: proximas.slice(0, 6),
      proximoHorario,
      siguientesReservas,
      mejorCancha: porCancha[0] || null
    };
  }, [bloqueos, canchas, fecha, reservas]);

  if (cargando) {
    return (
      <AdminLayout title="Dashboard">
        <section className="card">
          <div className="empty-state">
            <p>Cargando dashboard...</p>
          </div>
        </section>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <section className="card executive-hero executive-hero-single">
        <div className="executive-hero-copy">
          <span className="section-badge">Resumen ejecutivo</span>
          <h2>Operacion del club al dia</h2>
          <p>{formatearFechaLarga(fecha)}. Seguimiento rapido de actividad, ingresos y proximos movimientos de agenda.</p>
        </div>
      </section>

      <section className="report-kpi-grid executive-kpi-grid">
        <article className="kpi-card-pro primary">
          <span>Ingresos del dia</span>
          <strong>{formatCurrency(resumen.ingresos)}</strong>
        </article>
        <article className="kpi-card-pro success">
          <span>Reservas confirmadas</span>
          <strong>{resumen.confirmadas}</strong>
        </article>
        <article className="kpi-card-pro warning">
          <span>Bloqueos activos hoy</span>
          <strong>{resumen.bloqueos}</strong>
        </article>
        <article className="kpi-card-pro neutral">
          <span>Canchas activas</span>
          <strong>{resumen.activas}</strong>
        </article>
        <article className="kpi-card-pro dark">
          <span>Canceladas</span>
          <strong>{resumen.canceladas}</strong>
        </article>
      </section>

      <section className="executive-dashboard-grid executive-dashboard-grid-wide">
        <article className="card executive-panel">
          <div className="executive-panel-header">
            <div>
              <span className="section-badge">Agenda inmediata</span>
              <h2>Proximas reservas</h2>
            </div>
            <strong>{resumen.proximas.length}</strong>
          </div>

          {resumen.proximas.length > 0 ? (
            <div className="executive-timeline">
              {resumen.proximas.map((reserva) => (
                <div key={reserva.id} className="executive-timeline-item">
                  <div className="executive-timeline-time">
                    <strong>{reserva.hora_inicio}</strong>
                    <span>{reserva.hora_fin}</span>
                  </div>
                  <div className="executive-timeline-body">
                    <strong>{reserva.cancha_nombre}</strong>
                    <span>{reserva.nombre_cliente}</span>
                    <small>{reserva.con_luz ? 'Con luz' : 'Sin luz'} · {formatCurrency(reserva.precio_total)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No hay próximas reservas confirmadas hoy.</p>
            </div>
          )}
        </article>

        <div className="executive-side-column">
          <article className="card executive-panel executive-ops-panel">
            <div className="executive-panel-header">
              <div>
                <span className="section-badge">Ritmo comercial</span>
                <h2>Indicadores clave</h2>
              </div>
            </div>

            <div className="executive-snapshot-grid executive-snapshot-grid-compact">
              <div className="executive-snapshot">
                <span>Ticket promedio</span>
                <strong>{formatCurrency(resumen.ticketPromedio)}</strong>
              </div>
              <div className="executive-snapshot">
                <span>Proximo horario</span>
                <strong>{resumen.proximoHorario || '-'}</strong>
              </div>
              <div className="executive-snapshot">
                <span>Total del dia</span>
                <strong>{resumen.totalReservas}</strong>
              </div>
              <div className="executive-snapshot">
                <span>Canchas en siguiente turno</span>
                <strong>{resumen.siguientesReservas.length}</strong>
              </div>
            </div>
          </article>

          <article className="card executive-panel executive-ops-panel">
            <div className="executive-panel-header">
              <div>
                <span className="section-badge">Siguiente turno</span>
                <h2>Reservas del proximo horario</h2>
              </div>
            </div>

            {resumen.siguientesReservas.length > 0 ? (
              <div className="executive-next-grid">
                {resumen.siguientesReservas.map((reserva) => (
                  <article key={reserva.id} className="executive-next-card">
                    <strong>{reserva.cancha_nombre}</strong>
                    <span>{reserva.hora_inicio} a {reserva.hora_fin}</span>
                    <small>{reserva.nombre_cliente}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No hay reservas confirmadas para hoy.</p>
              </div>
            )}
          </article>
        </div>
      </section>

      {error ? <div className="error-box mt-16">{error}</div> : null}
    </AdminLayout>
  );
}
