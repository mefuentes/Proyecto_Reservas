import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { obtenerReporteResumen, obtenerCanchasAdmin, descargarReporteExcel, descargarReportePdf } from '../services/adminApi';
import { formatCurrency } from '../utils/currency';

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function today() { return new Date(); }

function descargar(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function getRange(tipo, selectedDay, selectedMonth, selectedYear, customDesde, customHasta) {
  if (tipo === 'dia') return { desde: selectedDay, hasta: selectedDay };
  if (tipo === 'mes') {
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return { desde: `${selectedMonth}-01`, hasta: `${selectedMonth}-${String(lastDay).padStart(2, '0')}` };
  }
  if (tipo === 'anio') return { desde: `${selectedYear}-01-01`, hasta: `${selectedYear}-12-31` };
  return { desde: customDesde, hasta: customHasta };
}

function HorizontalBarChart({ data = [], labelKey, valueKey, valueFormatter = (v) => String(v), color = 'var(--primary)' }) {
  const max = Math.max(...data.map((x) => Number(x[valueKey] || 0)), 0);
  if (!data.length) return <div className="empty-state"><p>Sin datos</p></div>;
  return (
    <div className="hbar-chart">
      {data.map((item, idx) => {
        const value = Number(item[valueKey] || 0);
        const pct = max ? (value / max) * 100 : 0;
        return (
          <div key={`${item[labelKey]}-${idx}`} className="hbar-row">
            <div className="hbar-head">
              <span className="hbar-label" title={String(item[labelKey])}>{item[labelKey]}</span>
              <strong className="hbar-value">{valueFormatter(value)}</strong>
            </div>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({ title, value, tone = 'primary' }) {
  return (
    <article className={`kpi-card-pro ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function AdminReportes() {
  const pageSize = 10;
  const now = today();
  const [tipoPeriodo, setTipoPeriodo] = useState('mes');
  const [selectedDay, setSelectedDay] = useState(formatDate(now));
  const [selectedMonth, setSelectedMonth] = useState(monthValue(now));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [customDesde, setCustomDesde] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [customHasta, setCustomHasta] = useState(formatDate(now));
  const [canchaId, setCanchaId] = useState('');
  const [canchas, setCanchas] = useState([]);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => String(current - 3 + i));
  }, []);

  const { desde, hasta } = useMemo(
    () => getRange(tipoPeriodo, selectedDay, selectedMonth, selectedYear, customDesde, customHasta),
    [tipoPeriodo, selectedDay, selectedMonth, selectedYear, customDesde, customHasta]
  );

  async function cargar(pageOverride = page) {
    try {
      setError('');
      setCargando(true);
      const resp = await obtenerReporteResumen(desde, hasta, canchaId, pageOverride, pageSize);
      if (!resp.ok) return setError(resp.message || 'No se pudo obtener el reporte.');
      setData(resp.data);
    } catch {
      setError('No se pudo obtener el reporte.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    (async () => {
      const resp = await obtenerCanchasAdmin();
      if (resp.ok) setCanchas(resp.data || []);
    })();
  }, []);

  useEffect(() => { cargar(); }, [desde, hasta, canchaId, page]);

  useEffect(() => {
    setPage(1);
  }, [tipoPeriodo, selectedDay, selectedMonth, selectedYear, customDesde, customHasta, canchaId]);

  const porDia = useMemo(() => (data?.por_dia || []).slice(-10), [data]);
  const porCancha = useMemo(() => (data?.por_cancha || []).slice(0, 8), [data]);
  const porHorario = useMemo(() => (data?.por_horario || []).slice(0, 8), [data]);
  const detalle = useMemo(() => (data?.detalle || []), [data]);

  async function onExcel() {
    try {
      const blob = await descargarReporteExcel(desde, hasta, canchaId);
      descargar(blob, `reporte-reservas-${desde}-${hasta}.xlsx`);
    } catch {
      setError('No se pudo descargar Excel.');
    }
  }

  async function onPdf() {
    try {
      const blob = await descargarReportePdf(desde, hasta, canchaId);
      descargar(blob, `reporte-reservas-${desde}-${hasta}.pdf`);
    } catch {
      setError('No se pudo descargar PDF.');
    }
  }

  return (
    <AdminLayout title="Reportes">
      <section className="card report-hero">
        <div className="section-header">
          <span className="section-badge">Analitica operativa</span>
          <h2>Reporte de reservas e ingresos</h2>
          <p>Vista consolidada por periodo con exportacion y filtros por cancha.</p>
        </div>

        <div className="period-tabs">
          <button type="button" className={tipoPeriodo === 'dia' ? 'period-tab active' : 'period-tab'} onClick={() => setTipoPeriodo('dia')}>Dia</button>
          <button type="button" className={tipoPeriodo === 'mes' ? 'period-tab active' : 'period-tab'} onClick={() => setTipoPeriodo('mes')}>Mes</button>
          <button type="button" className={tipoPeriodo === 'anio' ? 'period-tab active' : 'period-tab'} onClick={() => setTipoPeriodo('anio')}>Año</button>
          <button type="button" className={tipoPeriodo === 'rango' ? 'period-tab active' : 'period-tab'} onClick={() => setTipoPeriodo('rango')}>Rango</button>
        </div>

        <div className="admin-toolbar report-toolbar">
          {tipoPeriodo === 'dia' && (
            <div className="form-group">
              <label>Dia</label>
              <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} />
            </div>
          )}
          {tipoPeriodo === 'mes' && (
            <div className="form-group">
              <label>Mes</label>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
          )}
          {tipoPeriodo === 'anio' && (
            <div className="form-group">
              <label>Año</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          )}
          {tipoPeriodo === 'rango' && (
            <>
              <div className="form-group">
                <label>Desde</label>
                <input type="date" value={customDesde} onChange={(e) => setCustomDesde(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Hasta</label>
                <input type="date" value={customHasta} onChange={(e) => setCustomHasta(e.target.value)} />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Cancha</label>
            <select value={canchaId} onChange={(e) => setCanchaId(e.target.value)}>
              <option value="">Todas</option>
              {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <button className="primary-btn" onClick={() => { setPage(1); cargar(1); }} disabled={cargando}>{cargando ? 'Actualizando...' : 'Actualizar'}</button>
          <button className="secondary-btn" onClick={onExcel}>Excel</button>
          <button className="secondary-btn" onClick={onPdf}>PDF</button>
        </div>

        <div className="muted-note">Periodo seleccionado: {desde} a {hasta}</div>
        {error && <div className="error-box mt-16">{error}</div>}
      </section>

      {data && (
        <>
          <section className="report-kpi-grid">
            <KpiCard title="Reservas totales" value={data.resumen?.total_reservas || 0} />
            <KpiCard title="Confirmadas" value={data.resumen?.total_confirmadas || 0} tone="success" />
            <KpiCard title="Canceladas" value={data.resumen?.total_canceladas || 0} tone="warning" />
            <KpiCard title="Reprogramadas" value={data.resumen?.total_reprogramadas || 0} tone="neutral" />
            <KpiCard title="Ingresos" value={formatCurrency(data.resumen?.ingresos_estimados || 0)} tone="dark" />
          </section>

          <section className="report-grid-pro">
            <article className="card chart-card">
              <h2>Reservas por dia</h2>
              <HorizontalBarChart
                data={porDia}
                labelKey="fecha"
                valueKey="reservas"
                valueFormatter={(v) => `${v}`}
                color="#2563eb"
              />
            </article>
            <article className="card chart-card">
              <h2>Ingresos por dia</h2>
              <HorizontalBarChart
                data={porDia}
                labelKey="fecha"
                valueKey="ingresos"
                valueFormatter={(v) => formatCurrency(v)}
                color="#16a34a"
              />
            </article>
          </section>

          <section className="report-grid-pro">
            <article className="card chart-card">
              <h2>Demanda por cancha</h2>
              <HorizontalBarChart
                data={porCancha}
                labelKey="cancha"
                valueKey="reservas"
                valueFormatter={(v) => `${v} reservas`}
                color="#0ea5e9"
              />
            </article>
            <article className="card chart-card">
              <h2>Horarios mas utilizados</h2>
              <HorizontalBarChart
                data={porHorario}
                labelKey="hora_inicio"
                valueKey="reservas"
                valueFormatter={(v) => `${v} reservas`}
                color="#8b5cf6"
              />
            </article>
          </section>

          <section className="card">
            <h2>Detalle reciente</h2>
            {detalle.length ? (
              <>
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead><tr><th>Fecha</th><th>Cancha</th><th>Horario</th><th>Cliente</th><th>Estado</th><th>Total</th></tr></thead>
                    <tbody>
                      {detalle.map((item, idx) => (
                        <tr key={`${item.fecha}-${item.hora_inicio}-${idx}`}>
                          <td>{item.fecha}</td>
                          <td>{item.cancha}</td>
                          <td>{item.hora_inicio} a {item.hora_fin}</td>
                          <td>{item.nombre_cliente}</td>
                          <td>{item.estado}</td>
                          <td>{formatCurrency(item.precio_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(data?.detalle_pagination?.total_pages || 1) > 1 && (
                  <div className="pagination-bar">
                    <button type="button" className="secondary-btn small-btn" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1}>Anterior</button>
                    <span className="pagination-text">Pagina {data.detalle_pagination.page} de {data.detalle_pagination.total_pages} · {data.detalle_pagination.total} registros</span>
                    <button type="button" className="secondary-btn small-btn" onClick={() => setPage((prev) => Math.min(prev + 1, data.detalle_pagination.total_pages))} disabled={page >= data.detalle_pagination.total_pages}>Siguiente</button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state"><p>No hay detalle para mostrar.</p></div>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
}
