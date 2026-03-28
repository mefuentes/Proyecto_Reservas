function normalizarApiBase(rawBase) {
  const base = String(rawBase || 'http://localhost:3000/api').trim().replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

const API_BASE = normalizarApiBase(import.meta.env.VITE_API_URL);

function getToken() { return localStorage.getItem('admin_token'); }
function limpiarSesion() { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); }
function buildHeaders(extra = {}) { const token = getToken(); return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }; }

async function parseAdminResponse(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = { ok: response.ok, message: response.ok ? '' : `HTTP ${response.status}` };
  }

  if (response.status === 401) {
    limpiarSesion();
    window.location.href = '/admin/login';
    return { ok: false, message: 'Sesion vencida. Inicia sesion nuevamente.' };
  }

  if (!response.ok && (!data || typeof data !== 'object')) {
    return { ok: false, message: `HTTP ${response.status}` };
  }

  return data;
}

export async function adminLogin(payload) { const response = await fetch(`${API_BASE}/admin/login`, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function obtenerAgenda(fecha, canchaId = '', estado = '') { const params = new URLSearchParams({ fecha }); if (canchaId) params.append('cancha_id', canchaId); if (estado) params.append('estado', estado); const response = await fetch(`${API_BASE}/admin/agenda?${params.toString()}`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export async function cancelarReserva(id) { const response = await fetch(`${API_BASE}/admin/reservas/${id}/cancelar`, { method: 'PATCH', headers: buildHeaders() }); return parseAdminResponse(response); }
export async function reprogramarReservaAdmin(id, payload) { const response = await fetch(`${API_BASE}/admin/reservas/${id}/reprogramar`, { method: 'PATCH', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function crearReservaAdmin(payload) { const response = await fetch(`${API_BASE}/admin/reservas`, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function obtenerCanchasAdmin() { const response = await fetch(`${API_BASE}/admin/canchas`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export async function crearCancha(payload) { const response = await fetch(`${API_BASE}/admin/canchas`, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function editarCancha(id, payload) { const response = await fetch(`${API_BASE}/admin/canchas/${id}`, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function cambiarEstadoCancha(id, activa) { const response = await fetch(`${API_BASE}/admin/canchas/${id}/estado`, { method: 'PATCH', headers: buildHeaders(), body: JSON.stringify({ activa }) }); return parseAdminResponse(response); }
export async function obtenerBloqueos(fecha = '', canchaId = '', todos = false) { const params = new URLSearchParams(); if (fecha) params.append('fecha', fecha); if (canchaId) params.append('cancha_id', canchaId); if (todos) params.append('todos', '1'); const suffix = params.toString() ? `?${params.toString()}` : ''; const response = await fetch(`${API_BASE}/admin/bloqueos${suffix}`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export async function crearBloqueo(payload) { const response = await fetch(`${API_BASE}/admin/bloqueos`, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function actualizarBloqueo(id, payload) { const response = await fetch(`${API_BASE}/admin/bloqueos/${id}`, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function eliminarBloqueo(id) { const response = await fetch(`${API_BASE}/admin/bloqueos/${id}`, { method: 'DELETE', headers: buildHeaders() }); return parseAdminResponse(response); }
export async function obtenerConfiguracionAdmin() { const response = await fetch(`${API_BASE}/admin/configuracion`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export async function actualizarConfiguracion(payload) { const response = await fetch(`${API_BASE}/admin/configuracion`, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function obtenerDisponibilidadPublica({ fecha, cancha_id, duracion }) { const params = new URLSearchParams({ fecha, cancha_id: String(cancha_id), duracion: String(duracion) }); const response = await fetch(`${API_BASE}/disponibilidad?${params.toString()}`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export async function obtenerTarifas() { const response = await fetch(`${API_BASE}/admin/tarifas`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export async function crearTarifa(payload) { const response = await fetch(`${API_BASE}/admin/tarifas`, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function actualizarTarifa(id, payload) { const response = await fetch(`${API_BASE}/admin/tarifas/${id}`, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function eliminarTarifa(id) { const response = await fetch(`${API_BASE}/admin/tarifas/${id}`, { method: 'DELETE', headers: buildHeaders() }); return parseAdminResponse(response); }
export async function obtenerReporteResumen(desde, hasta, canchaId = '', page = 1, pageSize = 10) { const params = new URLSearchParams({ desde, hasta, page: String(page), page_size: String(pageSize) }); if (canchaId) params.append('cancha_id', canchaId); const response = await fetch(`${API_BASE}/admin/reportes/resumen?${params.toString()}`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export function cerrarSesionAdmin() { limpiarSesion(); }

export async function obtenerClientesAdmin(q = '', page = 1, pageSize = 10) { const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) }); if (q) params.append('q', q); const suffix = params.toString() ? `?${params.toString()}` : ''; const response = await fetch(`${API_BASE}/admin/clientes${suffix}`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export async function crearClienteAdmin(payload) { const response = await fetch(`${API_BASE}/admin/clientes`, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function actualizarClienteAdmin(id, payload) { const response = await fetch(`${API_BASE}/admin/clientes/${id}`, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function eliminarClienteAdmin(id) { const response = await fetch(`${API_BASE}/admin/clientes/${id}`, { method: 'DELETE', headers: buildHeaders() }); return parseAdminResponse(response); }
export async function obtenerUsuariosAdmin(q = '', page = 1, pageSize = 10) { const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) }); if (q) params.append('q', q); const suffix = params.toString() ? `?${params.toString()}` : ''; const response = await fetch(`${API_BASE}/admin/usuarios${suffix}`, { headers: buildHeaders() }); return parseAdminResponse(response); }
export async function crearUsuarioAdmin(payload) { const response = await fetch(`${API_BASE}/admin/usuarios`, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function actualizarUsuarioAdmin(id, payload) { const response = await fetch(`${API_BASE}/admin/usuarios/${id}`, { method: 'PUT', headers: buildHeaders(), body: JSON.stringify(payload) }); return parseAdminResponse(response); }
export async function cambiarEstadoUsuarioAdmin(id, activo) { const response = await fetch(`${API_BASE}/admin/usuarios/${id}/estado`, { method: 'PATCH', headers: buildHeaders(), body: JSON.stringify({ activo }) }); return parseAdminResponse(response); }

export async function descargarReporteExcel(desde, hasta, canchaId = '') {
  const params = new URLSearchParams({ desde, hasta });
  if (canchaId) params.append('cancha_id', canchaId);
  const response = await fetch(`${API_BASE}/admin/reportes/exportar-excel?${params.toString()}`, { headers: buildHeaders({}) });
  if (response.status === 401) { limpiarSesion(); window.location.href = '/admin/login'; throw new Error('Sesion vencida'); }
  if (!response.ok) throw new Error('No se pudo descargar Excel');
  return response.blob();
}

export async function descargarReportePdf(desde, hasta, canchaId = '') {
  const params = new URLSearchParams({ desde, hasta });
  if (canchaId) params.append('cancha_id', canchaId);
  const response = await fetch(`${API_BASE}/admin/reportes/exportar-pdf?${params.toString()}`, { headers: buildHeaders({}) });
  if (response.status === 401) { limpiarSesion(); window.location.href = '/admin/login'; throw new Error('Sesion vencida'); }
  if (!response.ok) throw new Error('No se pudo descargar PDF');
  return response.blob();
}

export async function obtenerClientePorDocumentoAdmin(documento) { const response = await fetch(`${API_BASE}/clientes/${documento}`); return response.json(); }
