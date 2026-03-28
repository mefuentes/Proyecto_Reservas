import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { cambiarEstadoUsuarioAdmin, crearUsuarioAdmin, actualizarUsuarioAdmin, obtenerUsuariosAdmin } from '../services/adminApi';

const initialNuevoUsuario = { nombre: '', email: '', rol: 'empleado', password: '' };
const initialEdicion = { nombre: '', email: '', rol: 'empleado', password: '' };

export default function AdminUsuarios() {
  const pageSize = 10;
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [usuarios, setUsuarios] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, page_size: pageSize, total_pages: 1 });
  const [nuevoUsuario, setNuevoUsuario] = useState(initialNuevoUsuario);
  const [editando, setEditando] = useState(null);
  const [formEdicion, setFormEdicion] = useState(initialEdicion);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function cargarUsuarios(pageOverride = page) {
    setError('');
    const resp = await obtenerUsuariosAdmin(q, pageOverride, pageSize);
    if (!resp.ok) return setError(resp.message || 'No se pudieron cargar los usuarios.');
    setUsuarios(resp.data || []);
    setPagination(resp.pagination || { total: 0, page: 1, page_size: pageSize, total_pages: 1 });
  }

  useEffect(() => {
    cargarUsuarios();
  }, [page]);

  function iniciarEdicion(usuario) {
    setEditando(usuario.id);
    setFormEdicion({
      nombre: usuario.nombre || '',
      email: usuario.email || '',
      rol: usuario.rol === 'gerencial' ? 'gerencial' : (usuario.rol === 'empleado' ? 'empleado' : 'gerencial'),
      password: ''
    });
    setError('');
    setInfo('');
  }

  async function handleCrearUsuario(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!nuevoUsuario.nombre.trim() || !nuevoUsuario.email.trim() || !nuevoUsuario.password.trim()) {
      setError('Nombre, email y contrasena son obligatorios.');
      return;
    }

    try {
      setGuardandoNuevo(true);
      const resp = await crearUsuarioAdmin({
        ...nuevoUsuario,
        nombre: nuevoUsuario.nombre.trim(),
        email: nuevoUsuario.email.trim().toLowerCase()
      });
      if (!resp.ok) return setError(resp.message || 'No se pudo crear el usuario.');
      setInfo('Usuario creado correctamente.');
      setNuevoUsuario(initialNuevoUsuario);
      setPage(1);
      await cargarUsuarios(1);
    } finally {
      setGuardandoNuevo(false);
    }
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    const payload = {
      nombre: formEdicion.nombre.trim(),
      email: formEdicion.email.trim().toLowerCase(),
      rol: formEdicion.rol
    };
    if (formEdicion.password.trim()) {
      payload.password = formEdicion.password.trim();
    }

    const resp = await actualizarUsuarioAdmin(editando, payload);
    if (!resp.ok) return setError(resp.message || 'No se pudo actualizar el usuario.');
    setInfo('Usuario actualizado correctamente.');
    setEditando(null);
    setFormEdicion(initialEdicion);
    await cargarUsuarios();
  }

  async function handleCambiarEstado(usuario) {
    setError('');
    setInfo('');
    const activar = !usuario.activo;
    const confirmar = window.confirm(activar ? 'Se activara el usuario seleccionado. Desea continuar?' : 'Se desactivara el usuario seleccionado. Desea continuar?');
    if (!confirmar) return;

    const resp = await cambiarEstadoUsuarioAdmin(usuario.id, activar);
    if (!resp.ok) return setError(resp.message || 'No se pudo actualizar el estado del usuario.');
    setInfo(activar ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.');
    await cargarUsuarios();
  }

  return (
    <AdminLayout title="Usuarios">
      <section className="card">
        <div className="section-header">
          <span className="section-badge">Accesos del panel</span>
          <h2>Alta de usuarios</h2>
          <p>Gerencial tiene acceso completo al panel. Empleado solo accede a dashboard y agenda.</p>
        </div>
        <form onSubmit={handleCrearUsuario}>
          <div className="form-grid">
            <div className="form-group"><label>Nombre</label><input type="text" value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, nombre: e.target.value }))} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={nuevoUsuario.email} onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, email: e.target.value }))} /></div>
            <div className="form-group"><label>Rol</label><select value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, rol: e.target.value }))}><option value="gerencial">Gerencial</option><option value="empleado">Empleado</option></select></div>
          </div>
          <div className="form-grid two-cols">
            <div className="form-group"><label>Contrasena inicial</label><input type="password" value={nuevoUsuario.password} onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, password: e.target.value }))} /></div>
          </div>
          <button className="primary-btn" type="submit" disabled={guardandoNuevo}>{guardandoNuevo ? 'Guardando...' : 'Agregar usuario'}</button>
        </form>
      </section>

      <section className="card">
        <div className="admin-toolbar">
          <div className="form-group grow-field">
            <label>Buscar</label>
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, email o rol" />
          </div>
          <button className="primary-btn auto-btn" onClick={() => { setPage(1); cargarUsuarios(1); }}>Buscar</button>
        </div>
      </section>

      {editando && (
        <section className="card">
          <h2>Editar usuario</h2>
          <form onSubmit={handleGuardarEdicion}>
            <div className="form-grid">
              <div className="form-group"><label>Nombre</label><input type="text" value={formEdicion.nombre} onChange={(e) => setFormEdicion((prev) => ({ ...prev, nombre: e.target.value }))} /></div>
              <div className="form-group"><label>Email</label><input type="email" value={formEdicion.email} onChange={(e) => setFormEdicion((prev) => ({ ...prev, email: e.target.value }))} /></div>
              <div className="form-group"><label>Rol</label><select value={formEdicion.rol} onChange={(e) => setFormEdicion((prev) => ({ ...prev, rol: e.target.value }))}><option value="gerencial">Gerencial</option><option value="empleado">Empleado</option></select></div>
            </div>
            <div className="form-grid two-cols">
              <div className="form-group"><label>Nueva contrasena</label><input type="password" value={formEdicion.password} onChange={(e) => setFormEdicion((prev) => ({ ...prev, password: e.target.value }))} placeholder="Dejar vacio para mantener la actual" /></div>
            </div>
            <div className="admin-actions"><button className="primary-btn" type="submit">Guardar</button><button className="secondary-btn" type="button" onClick={() => { setEditando(null); setFormEdicion(initialEdicion); }}>Cancelar</button></div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr></thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.email}</td>
                  <td><span className="status-badge user-role-badge">{formatRol(usuario.rol)}</span></td>
                  <td><span className={usuario.activo ? 'status-badge status-ok' : 'status-badge status-cancelled'}>{usuario.activo ? 'activo' : 'inactivo'}</span></td>
                  <td>{String(usuario.created_at || '').slice(0, 10) || '-'}</td>
                  <td><div className="table-actions"><button className="secondary-btn small-btn" onClick={() => iniciarEdicion(usuario)}>Editar</button><button className={usuario.activo ? 'danger-btn small-btn' : 'primary-btn small-btn'} onClick={() => handleCambiarEstado(usuario)}>{usuario.activo ? 'Desactivar' : 'Activar'}</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.total_pages > 1 && (
          <div className="pagination-bar">
            <button type="button" className="secondary-btn small-btn" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1}>Anterior</button>
            <span className="pagination-text">Pagina {pagination.page} de {pagination.total_pages} · {pagination.total} registros</span>
            <button type="button" className="secondary-btn small-btn" onClick={() => setPage((prev) => Math.min(prev + 1, pagination.total_pages))} disabled={page >= pagination.total_pages}>Siguiente</button>
          </div>
        )}
        {info && <div className="info-box mt-16">{info}</div>}
        {error && <div className="error-box mt-16">{error}</div>}
      </section>
    </AdminLayout>
  );
}
  function formatRol(rol) {
    return rol === 'empleado' ? 'empleado' : 'gerencial';
  }
