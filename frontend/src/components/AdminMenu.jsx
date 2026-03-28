import { NavLink, useNavigate } from 'react-router-dom';
import { cerrarSesionAdmin } from '../services/adminApi';
import { getAdminRole, getAdminUser, hasAdminRole } from '../utils/adminAuth';

export default function AdminMenu() {
  const navigate = useNavigate();
  const adminUser = getAdminUser();
  const adminRole = getAdminRole();

  function handleLogout() {
    cerrarSesionAdmin();
    navigate('/admin/login');
  }

  return (
    <aside className="admin-sidebar">
      <h2>Panel Admin</h2>
      <div className="admin-user-chip">
        <strong>{adminUser?.nombre || 'Usuario'}</strong>
        <span>{adminRole || 'sin rol'}</span>
      </div>
      <nav className="admin-nav">
        <NavLink to="/admin">Dashboard</NavLink>
        <NavLink to="/admin/agenda">Agenda</NavLink>
        {hasAdminRole('admin', 'gerente', 'gerencial', 'empleado') ? <NavLink to="/admin/nueva-reserva">Nueva Reserva</NavLink> : null}
        {hasAdminRole('admin', 'gerente', 'gerencial') ? <NavLink to="/admin/clientes">Clientes</NavLink> : null}
        {hasAdminRole('admin', 'gerente', 'gerencial') ? <NavLink to="/admin/canchas">Canchas</NavLink> : null}
        {hasAdminRole('admin', 'gerente', 'gerencial') ? <NavLink to="/admin/tarifas">Tarifas</NavLink> : null}
        {hasAdminRole('admin', 'gerente', 'gerencial') ? <NavLink to="/admin/bloqueos">Bloqueos</NavLink> : null}
        {hasAdminRole('admin', 'gerente', 'gerencial') ? <NavLink to="/admin/reportes">Reportes</NavLink> : null}
        {hasAdminRole('admin', 'gerente', 'gerencial') ? <NavLink to="/admin/configuracion">Configuracion</NavLink> : null}
        {hasAdminRole('admin', 'gerente', 'gerencial') ? <NavLink to="/admin/usuarios">Usuarios</NavLink> : null}
      </nav>
      <button className="danger-btn" onClick={handleLogout}>Cerrar sesion</button>
    </aside>
  );
}
