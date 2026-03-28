import { Navigate } from 'react-router-dom';
import { getAdminRole } from '../utils/adminAuth';

export default function ProtectedRoute({ children, roles = [] }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  if (roles.length > 0) {
    const role = getAdminRole();
    if (!role) return <Navigate to="/admin/login" replace />;
    if (!roles.includes(role)) return <Navigate to="/admin" replace />;
  }
  return children;
}
