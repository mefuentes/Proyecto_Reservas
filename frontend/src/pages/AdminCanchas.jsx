import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { obtenerCanchasAdmin, crearCancha, editarCancha, cambiarEstadoCancha } from '../services/adminApi';

export default function AdminCanchas() {
  const [canchas, setCanchas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [horaApertura, setHoraApertura] = useState('18:00');
  const [horaCierre, setHoraCierre] = useState('23:00');
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargarCanchas() {
    setError('');
    try {
      const resp = await obtenerCanchasAdmin();
      if (!resp.ok) return setError(resp.message || 'No se pudieron cargar las canchas.');
      setCanchas(resp.data || []);
    } catch {
      setError('No se pudieron cargar las canchas.');
    }
  }

  useEffect(() => { cargarCanchas(); }, []);

  function limpiarFormulario() {
    setNombre('');
    setDescripcion('');
    setHoraApertura('18:00');
    setHoraCierre('23:00');
    setEditandoId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!nombre.trim()) return setError('El nombre de la cancha es obligatorio.');
    if (!horaApertura || !horaCierre) return setError('Debes definir apertura y cierre.');
    try {
      setGuardando(true);
      const payload = { nombre: nombre.trim(), descripcion: descripcion.trim(), hora_apertura: horaApertura, hora_cierre: horaCierre };
      const resp = editandoId ? await editarCancha(editandoId, payload) : await crearCancha(payload);
      if (!resp.ok) return setError(resp.message || 'No se pudo guardar la cancha.');
      setInfo(editandoId ? 'Cancha actualizada correctamente.' : 'Cancha creada correctamente.');
      limpiarFormulario();
      await cargarCanchas();
    } catch {
      setError('No se pudo guardar la cancha.');
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarEstado(cancha) {
    setError('');
    setInfo('');
    try {
      const resp = await cambiarEstadoCancha(cancha.id, cancha.activa ? 0 : 1);
      if (!resp.ok) return setError(resp.message || 'No se pudo cambiar el estado.');
      setInfo('Estado de la cancha actualizado.');
      await cargarCanchas();
    } catch {
      setError('No se pudo cambiar el estado.');
    }
  }

  function handleEditar(cancha) {
    setEditandoId(cancha.id);
    setNombre(cancha.nombre || '');
    setDescripcion(cancha.descripcion || '');
    setHoraApertura(cancha.hora_apertura || '18:00');
    setHoraCierre(cancha.hora_cierre || '23:00');
  }

  return (
    <AdminLayout title="Gestion de canchas">
      <section className="card">
        <h2>{editandoId ? 'Editar cancha' : 'Nueva cancha'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid two-cols">
            <div className="form-group"><label>Nombre</label><input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cancha 1" /></div>
            <div className="form-group"><label>Descripcion</label><input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Techada" /></div>
            <div className="form-group"><label>Horario de apertura</label><input type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} /></div>
            <div className="form-group"><label>Horario de cierre</label><input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} /></div>
          </div>
          <div className="admin-actions">
            <button className="primary-btn" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : (editandoId ? 'Guardar cambios' : 'Crear cancha')}</button>
            {editandoId && <button className="secondary-btn" type="button" onClick={limpiarFormulario}>Cancelar edicion</button>}
          </div>
        </form>
        {info && <div className="info-box mt-16">{info}</div>}
        {error && <div className="error-box mt-16">{error}</div>}
      </section>
      <section className="card">
        {canchas.length ? <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Descripcion</th><th>Horario</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {canchas.map((cancha) => <tr key={cancha.id}><td>{cancha.id}</td><td>{cancha.nombre}</td><td>{cancha.descripcion || '-'}</td><td>{cancha.hora_apertura} a {cancha.hora_cierre}</td><td>{cancha.activa ? 'Activa' : 'Inactiva'}</td><td><div className="table-actions"><button type="button" className="secondary-btn small-btn" onClick={() => handleEditar(cancha)}>Editar</button><button type="button" className="danger-btn small-btn" onClick={() => handleCambiarEstado(cancha)}>{cancha.activa ? 'Desactivar' : 'Activar'}</button></div></td></tr>)}
            </tbody>
          </table>
        </div> : <div className="empty-state"><p>No hay canchas cargadas.</p></div>}
      </section>
    </AdminLayout>
  );
}
