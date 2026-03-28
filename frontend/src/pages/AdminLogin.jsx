import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/adminApi';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    if (!email.trim() || !password.trim()) { setError('Debés completar email y contraseña.'); return; }
    try {
      setCargando(true);
      const resp = await adminLogin({ email: email.trim(), password });
      if (!resp.ok) { setError(resp.message || 'Credenciales inválidas.'); return; }
      localStorage.setItem('admin_token', resp.data.token);
      localStorage.setItem('admin_user', JSON.stringify(resp.data.usuario));
      navigate('/admin');
    } catch { setError('Ocurrió un error al iniciar sesión.'); } finally { setCargando(false); }
  }

  return <div className="admin-login-page"><div className="admin-login-card"><h1>Acceso administrador</h1><p>Ingresá con tu correo y contraseña.</p><form onSubmit={handleSubmit}><div className="form-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@clubpadel.com" /></div><div className="form-group"><label>Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" /></div><button className="primary-btn" type="submit" disabled={cargando}>{cargando ? 'Ingresando...' : 'Iniciar sesión'}</button>{error && <div className="error-box mt-16">{error}</div>}</form></div></div>;
}
