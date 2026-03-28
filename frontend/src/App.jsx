import { Navigate, Route, Routes } from 'react-router-dom';
import ReservaPage from './pages/ReservaPage';
import ConfirmacionPage from './pages/ConfirmacionPage';
import MisReservasPage from './pages/MisReservasPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminAgenda from './pages/AdminAgenda';
import AdminNuevaReserva from './pages/AdminNuevaReserva';
import AdminCanchas from './pages/AdminCanchas';
import AdminClientes from './pages/AdminClientes';
import AdminTarifas from './pages/AdminTarifas';
import AdminBloqueos from './pages/AdminBloqueos';
import AdminReportes from './pages/AdminReportes';
import AdminConfiguracion from './pages/AdminConfiguracion';
import AdminUsuarios from './pages/AdminUsuarios';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/reservas" replace />} />
      <Route path="/reservas" element={<ReservaPage />} />
      <Route path="/confirmacion" element={<ConfirmacionPage />} />
      <Route path="/mis-reservas" element={<MisReservasPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial', 'empleado']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/agenda" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial', 'empleado']}><AdminAgenda /></ProtectedRoute>} />
      <Route path="/admin/nueva-reserva" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial', 'empleado']}><AdminNuevaReserva /></ProtectedRoute>} />
      <Route path="/admin/canchas" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial']}><AdminCanchas /></ProtectedRoute>} />
      <Route path="/admin/clientes" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial']}><AdminClientes /></ProtectedRoute>} />
      <Route path="/admin/tarifas" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial']}><AdminTarifas /></ProtectedRoute>} />
      <Route path="/admin/bloqueos" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial']}><AdminBloqueos /></ProtectedRoute>} />
      <Route path="/admin/reportes" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial']}><AdminReportes /></ProtectedRoute>} />
      <Route path="/admin/configuracion" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial']}><AdminConfiguracion /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute roles={['admin', 'gerente', 'gerencial']}><AdminUsuarios /></ProtectedRoute>} />
    </Routes>
  );
}
