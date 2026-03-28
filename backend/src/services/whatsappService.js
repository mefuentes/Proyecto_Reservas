const twilio = require('twilio');
const db = require('../config/db');
const { formatCurrency } = require('../utils/currency');

const provider = process.env.WHATSAPP_PROVIDER || 'none';
const publicReservasUrl = process.env.PUBLIC_RESERVAS_URL || 'http://localhost:5173/reservas?origen=whatsapp';
let twilioClient = null;

if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function normalizarTexto(texto = '') {
  return texto.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function logMensaje({ telefono, direccion, tipo, mensaje, estado = 'queued', metadata = null }) {
  db.run(
    `INSERT INTO whatsapp_mensajes (telefono, direccion, tipo, mensaje, estado, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
    [telefono, direccion, tipo, mensaje, estado, metadata ? JSON.stringify(metadata) : null],
    () => {}
  );
}

function esMensajeMenu(texto) {
  const t = normalizarTexto(texto);
  return ['hola', 'buenas', 'turno', 'turnos', 'reserva', 'reservar', 'padel', 'cancha', 'canchas'].some((item) => t.includes(item));
}

function esOpcionReservar(texto) {
  const t = normalizarTexto(texto);
  return t === '1' || t === 'reservar' || t === 'reserva';
}

function esOpcionAdministracion(texto) {
  const t = normalizarTexto(texto);
  return t === '2' || t === 'admin' || t === 'administracion' || t === 'administracion';
}

function obtenerMensajeMenu() {
  return ['Hola, gracias por contactarte con el Club de Padel.', '', 'Podes elegir una opcion:', '1. Reservar turno', '2. Hablar con administracion'].join('\n');
}

function obtenerMensajeReserva() {
  return ['Para reservar tu cancha ingresa aca:', publicReservasUrl].join('\n');
}

function obtenerMensajeAdministracion() {
  return 'Perfecto. En breve te respondera una persona de administracion.';
}

async function enviarTextoTwilio(to, body) {
  if (!twilioClient) throw new Error('Twilio no esta configurado');
  return twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to, body });
}

async function enviarTexto(to, body) {
  logMensaje({ telefono: to, direccion: 'outbound', tipo: 'text', mensaje: body });
  if (provider === 'twilio') {
    return enviarTextoTwilio(to, body);
  }
  return null;
}

async function procesarMensajeEntrante({ from, body }) {
  logMensaje({ telefono: from, direccion: 'inbound', tipo: 'text', mensaje: body, estado: 'received' });
  const texto = normalizarTexto(body);
  if (!texto) return { shouldReply: true, message: obtenerMensajeMenu() };
  if (esOpcionReservar(texto)) return { shouldReply: true, message: obtenerMensajeReserva() };
  if (esOpcionAdministracion(texto)) return { shouldReply: true, message: obtenerMensajeAdministracion() };
  if (esMensajeMenu(texto)) return { shouldReply: true, message: obtenerMensajeMenu() };
  return { shouldReply: true, message: obtenerMensajeMenu() };
}

async function enviarConfirmacionReserva({ telefono, cancha, fecha, hora_inicio, hora_fin, duracion_minutos, con_luz, precio_total }) {
  const body = [
    'Reserva confirmada',
    '',
    `Cancha: ${cancha}`,
    `Fecha: ${fecha}`,
    `Horario: ${hora_inicio} a ${hora_fin}`,
    `Duracion: ${duracion_minutos} minutos`,
    `Modalidad: ${con_luz ? 'Con luz' : 'Sin luz'}`,
    `Total: $${formatCurrency(precio_total)}`,
    '',
    'Te esperamos.'
  ].join('\n');
  return enviarTexto(telefono, body);
}

async function enviarCancelacionReserva({ telefono, cancha, fecha, hora_inicio, hora_fin }) {
  const body = ['Tu reserva fue cancelada correctamente.', '', `Cancha: ${cancha}`, `Fecha: ${fecha}`, `Horario: ${hora_inicio} a ${hora_fin}`].join('\n');
  return enviarTexto(telefono, body);
}

async function enviarReprogramacionReserva({ telefono, cancha, fecha, hora_inicio, hora_fin, con_luz, precio_total }) {
  const body = [
    'Tu reserva fue reprogramada correctamente.',
    '',
    `Cancha: ${cancha}`,
    `Fecha: ${fecha}`,
    `Horario: ${hora_inicio} a ${hora_fin}`,
    `Modalidad: ${con_luz ? 'Con luz' : 'Sin luz'}`,
    `Total: $${formatCurrency(precio_total)}`
  ].join('\n');
  return enviarTexto(telefono, body);
}

module.exports = {
  normalizarTexto,
  obtenerMensajeMenu,
  obtenerMensajeReserva,
  obtenerMensajeAdministracion,
  procesarMensajeEntrante,
  enviarTexto,
  enviarConfirmacionReserva,
  enviarCancelacionReserva,
  enviarReprogramacionReserva
};
