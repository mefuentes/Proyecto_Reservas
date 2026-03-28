import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { obtenerBloqueos, crearBloqueo, obtenerCanchasAdmin, actualizarBloqueo, eliminarBloqueo } from '../services/adminApi';

function obtenerFechaHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DIAS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' }
];

export default function AdminBloqueos() {
  const [fecha, setFecha] = useState(obtenerFechaHoy());
  const [canchas, setCanchas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [tipo, setTipo] = useState('fecha');
  const [canchaId, setCanchaId] = useState('');
  const [diaSemana, setDiaSemana] = useState('0');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaBusqueda, setFechaBusqueda] = useState(obtenerFechaHoy());
  const [canchaBusqueda, setCanchaBusqueda] = useState('');
  const [verTodos, setVerTodos] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function cargarCanchas() {
    const resp = await obtenerCanchasAdmin();
    if (resp.ok) setCanchas(resp.data || []);
  }

  async function cargarBloqueos() {
    const resp = await obtenerBloqueos(verTodos ? '' : fechaBusqueda, canchaBusqueda, verTodos);
    if (!resp.ok) return setError(resp.message || 'No se pudieron cargar los bloqueos.');
    setBloqueos(resp.data || []);
  }

  useEffect(() => { cargarCanchas(); }, []);
  useEffect(() => { cargarBloqueos(); }, [fechaBusqueda, canchaBusqueda, verTodos]);

  function limpiarFormulario() {
    setEditandoId(null);
    setTipo('fecha');
    setCanchaId('');
    setDiaSemana('0');
    setFechaDesde('');
    setFechaHasta('');
    setHoraInicio('');
    setHoraFin('');
    setMotivo('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if ((tipo !== 'semanal' && !canchaId) || !horaInicio || !horaFin) return setError('Debes completar los datos del bloqueo.');
    if (tipo === 'fecha' && !fecha) return setError('Debes seleccionar una fecha.');

    const payload = {
      cancha_id: canchaId ? Number(canchaId) : null,
      tipo,
      fecha: tipo === 'fecha' ? fecha : null,
      dia_semana: tipo === 'semanal' ? Number(diaSemana) : null,
      fecha_desde: tipo === 'semanal' ? (fechaDesde || null) : null,
      fecha_hasta: tipo === 'semanal' ? (fechaHasta || null) : null,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      motivo: motivo.trim()
    };

    const resp = editandoId ? await actualizarBloqueo(editandoId, payload) : await crearBloqueo(payload);
    if (!resp.ok) return setError(resp.message || 'No se pudo guardar el bloqueo.');
    setInfo(editandoId ? 'Bloqueo actualizado correctamente.' : 'Bloqueo creado correctamente.');
    limpiarFormulario();
    cargarBloqueos();
  }

  async function handleEliminar(id) {
    if (!window.confirm('Quieres eliminar este bloqueo?')) return;
    const resp = await eliminarBloqueo(id);
    if (!resp.ok) return setError(resp.message || 'No se pudo eliminar el bloqueo.');
    setInfo('Bloqueo eliminado correctamente.');
    if (editandoId === id) limpiarFormulario();
    cargarBloqueos();
  }

  function cargarEdicion(bloqueo) {
    setEditandoId(bloqueo.id);
    setTipo(bloqueo.tipo || 'fecha');
    setCanchaId(String(bloqueo.cancha_id || 0));
    setDiaSemana(String(bloqueo.dia_semana ?? 0));
    setFecha(bloqueo.fecha || obtenerFechaHoy());
    setFechaDesde(bloqueo.fecha_desde || '');
    setFechaHasta(bloqueo.fecha_hasta || '');
    setHoraInicio(bloqueo.hora_inicio);
    setHoraFin(bloqueo.hora_fin);
    setMotivo(bloqueo.motivo || '');
  }

  function describirBloqueo(bloqueo) {
    if (bloqueo.tipo === 'semanal') {
      const dia = DIAS.find((item) => item.value === Number(bloqueo.dia_semana))?.label || 'Dia';
      const rango = bloqueo.fecha_desde || bloqueo.fecha_hasta ? ` (${bloqueo.fecha_desde || 'sin inicio'} a ${bloqueo.fecha_hasta || 'sin fin'})` : ' (todo el anio)';
      return `Fijo semanal: ${dia}${rango}`;
    }
    return `Por fecha: ${bloqueo.fecha}`;
  }

  return (
    <AdminLayout title="Bloqueos horarios">
      <section className="card">
        <h2>{editandoId ? 'Editar bloqueo' : 'Nuevo bloqueo'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="fecha">Por fecha</option>
                <option value="semanal">Fijo semanal</option>
              </select>
            </div>
            {tipo === 'fecha' ? (
              <div className="form-group"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            ) : (
              <div className="form-group"><label>Dia de semana</label><select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>{DIAS.map((dia) => <option key={dia.value} value={dia.value}>{dia.label}</option>)}</select></div>
            )}
            <div className="form-group"><label>Cancha</label><select value={canchaId} onChange={(e) => setCanchaId(e.target.value)}><option value="">Seleccionar cancha</option><option value="0">General (todas)</option>{canchas.filter((c) => c.activa).map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}</select></div>
            <div className="form-group"><label>Motivo</label><input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: mantenimiento" /></div>
            <div className="form-group"><label>Hora inicio</label><input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} /></div>
            <div className="form-group"><label>Hora fin</label><input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} /></div>
            {tipo === 'semanal' ? <div className="form-group"><label>Desde</label><input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} /></div> : null}
            {tipo === 'semanal' ? <div className="form-group"><label>Hasta</label><input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} /></div> : null}
          </div>
          <div className="admin-actions"><button className="primary-btn" type="submit">{editandoId ? 'Guardar cambios' : 'Crear bloqueo'}</button>{editandoId && <button className="secondary-btn" type="button" onClick={limpiarFormulario}>Cancelar edicion</button>}</div>
        </form>
        {info && <div className="info-box mt-16">{info}</div>}
        {error && <div className="error-box mt-16">{error}</div>}
      </section>
      <section className="card">
        <div className="section-header">
          <h2>Buscar bloqueos</h2>
          <p>Podes ver todos los bloqueos existentes o filtrar por fecha y cancha.</p>
        </div>
        <div className="admin-toolbar">
          <div className="form-group">
            <label>Modo</label>
            <select value={verTodos ? 'todos' : 'fecha'} onChange={(e) => setVerTodos(e.target.value === 'todos')}>
              <option value="todos">Todos los bloqueos</option>
              <option value="fecha">Solo los que aplican a una fecha</option>
            </select>
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={fechaBusqueda} onChange={(e) => setFechaBusqueda(e.target.value)} disabled={verTodos} />
          </div>
          <div className="form-group">
            <label>Cancha</label>
            <select value={canchaBusqueda} onChange={(e) => setCanchaBusqueda(e.target.value)}>
              <option value="">Todas</option>
              {canchas.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
            </select>
          </div>
        </div>
        {bloqueos.length > 0 ? <div className="table-wrapper"><table className="admin-table"><thead><tr><th>Cancha</th><th>Tipo</th><th>Horario</th><th>Motivo</th><th>Acciones</th></tr></thead><tbody>{bloqueos.map((bloqueo) => <tr key={bloqueo.id}><td>{bloqueo.cancha_nombre}</td><td>{describirBloqueo(bloqueo)}</td><td>{bloqueo.hora_inicio} a {bloqueo.hora_fin}</td><td>{bloqueo.motivo || '-'}</td><td><div className="table-actions"><button className="secondary-btn small-btn" onClick={() => cargarEdicion(bloqueo)}>Editar</button><button className="danger-btn small-btn" onClick={() => handleEliminar(bloqueo.id)}>Eliminar</button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><p>No hay bloqueos para mostrar.</p></div>}
      </section>
    </AdminLayout>
  );
}
