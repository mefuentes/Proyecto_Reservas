function normalizarApiBase(rawBase) {
  const base = String(rawBase || 'http://localhost:3000/api').trim().replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

const API_URL = normalizarApiBase(import.meta.env.VITE_API_URL);

export async function obtenerConfiguracion() {
  const response = await fetch(`${API_URL}/configuracion`);
  return response.json();
}

export async function obtenerCanchas() {
  const response = await fetch(`${API_URL}/canchas`);
  return response.json();
}

export async function obtenerDisponibilidad({ fecha, cancha_id, duracion, aplicar_anticipacion = false }) {
  const params = new URLSearchParams({ fecha, duracion: String(duracion), aplicar_anticipacion: aplicar_anticipacion ? '1' : '0' });
  if (cancha_id != null && cancha_id !== '') params.append('cancha_id', String(cancha_id));
  const response = await fetch(`${API_URL}/disponibilidad?${params.toString()}`);
  return response.json();
}

export async function obtenerTarifa({ cancha_id, duracion, con_luz }) {
  const params = new URLSearchParams({ cancha_id: String(cancha_id), duracion: String(duracion), con_luz: con_luz ? '1' : '0' });
  const response = await fetch(`${API_URL}/tarifa?${params.toString()}`);
  return response.json();
}

export async function obtenerClientePorDocumento(documento) {
  const response = await fetch(`${API_URL}/clientes/${documento}`);
  return response.json();
}

export async function crearReserva(payload) {
  const response = await fetch(`${API_URL}/reservas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return response.json();
}

export async function buscarMisReservas({ documento, fecha }) {
  const params = new URLSearchParams({ documento, fecha });
  const response = await fetch(`${API_URL}/mis-reservas?${params.toString()}`);
  return response.json();
}

export async function cancelarMiReserva(id, documento) {
  const response = await fetch(`${API_URL}/mis-reservas/${id}/cancelar`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documento }) });
  return response.json();
}

export async function reprogramarMiReserva(id, payload) {
  const response = await fetch(`${API_URL}/mis-reservas/${id}/reprogramar`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return response.json();
}
