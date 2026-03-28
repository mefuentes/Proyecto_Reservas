const db = require('../config/db');
const { activeCondition } = require('../utils/dbHelpers');

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

const convertirHoraAMinutos = (hora = '00:00') => {
  const [h, m] = String(hora).split(':').map((p) => Number(p));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const convertirMinutosAHora = (minutos) => {
  const raw = Number(minutos);
  const modulo = ((raw % 1440) + 1440) % 1440;
  const h = Math.floor(modulo / 60);
  const m = modulo % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const intervalosSeSuperponen = (inicioA, finA, inicioB, finB) => {
  return inicioA < finB && inicioB < finA;
};

async function obtenerConfiguracion() {
  const row = await dbGet(`SELECT * FROM configuracion ORDER BY id DESC LIMIT 1`, []);
  return {
    hora_apertura: (row && row.hora_apertura) || '18:00',
    hora_cierre: (row && row.hora_cierre) || '23:00',
    intervalo_minutos: Number((row && row.intervalo_minutos) || 30)
  };
}

async function obtenerCanchasActivas() {
  return dbAll(`SELECT id, nombre, hora_apertura, hora_cierre FROM canchas WHERE activa ${activeCondition(true)} ORDER BY id ASC`, []);
}

async function obtenerCanchaPorId(canchaId) {
  return dbGet(`SELECT id, nombre, hora_apertura, hora_cierre, activa FROM canchas WHERE id = ?`, [canchaId]);
}

async function obtenerReservas(canchaId, fecha, excludeReservaId = null) {
  let sql = `SELECT id, hora_inicio, hora_fin FROM reservas WHERE cancha_id = ? AND fecha = ? AND estado IN ('confirmada', 'reprogramada')`;
  const params = [canchaId, fecha];
  if (excludeReservaId) {
    sql += ` AND id <> ?`;
    params.push(excludeReservaId);
  }
  return dbAll(sql, params);
}

async function obtenerBloqueos(canchaId, fecha) {
  return dbAll(
    `SELECT id, tipo, dia_semana, fecha, fecha_desde, fecha_hasta, hora_inicio, hora_fin FROM bloqueos_horarios WHERE cancha_id = ? AND activo ${activeCondition(true)}`,
    [canchaId]
  );
}

function bloqueoAplicaEnFecha(bloqueo, fecha) {
  if (!bloqueo) return false;
  if (bloqueo.tipo === 'fecha') return String(bloqueo.fecha) === String(fecha);
  if (bloqueo.tipo === 'semanal') {
    const dia = new Date(`${fecha}T00:00:00`).getDay();
    const diaBuscado = dia === 0 ? 7 : dia;
    return Number(bloqueo.dia_semana) === diaBuscado;
  }
  if (bloqueo.tipo === 'rango') {
    if (!bloqueo.fecha_desde || !bloqueo.fecha_hasta) return false;
    return fecha >= bloqueo.fecha_desde && fecha <= bloqueo.fecha_hasta;
  }
  return false;
}

async function calcularDisponibilidad(canchaId, fecha, duracionMinutos, options = {}) {
  const cancha = await obtenerCanchaPorId(canchaId);
  if (!cancha || !cancha.activa) return [];

  const config = await obtenerConfiguracion();
  const apertura = (config.hora_apertura && String(config.hora_apertura).trim()) || cancha.hora_apertura || '18:00';
  const cierre = (config.hora_cierre && String(config.hora_cierre).trim()) || cancha.hora_cierre || '23:00';
  const intervalo = Number(config.intervalo_minutos || 30);

  const aperturaMin = convertirHoraAMinutos(apertura);
  let cierreMin = convertirHoraAMinutos(cierre);
  if (aperturaMin === null || cierreMin === null) return [];
  if (cierreMin <= aperturaMin) cierreMin += 1440;

  const reservas = await obtenerReservas(canchaId, fecha, options.excludeReservaId);
  const bloqueos = (await obtenerBloqueos(canchaId, fecha)).filter((b) => bloqueoAplicaEnFecha(b, fecha));

  const disponible = [];
  const now = new Date();

  const mapIntervalo = (ini, fin) => {
    const inicio = Number(ini);
    const cierre = Number(fin);
    const f = cierre <= inicio ? cierre + 1440 : cierre;
    return { inicio, fin: f };
  };

  const reservasNormalizadas = reservas.map((r) => {
    const rInicio = convertirHoraAMinutos(r.hora_inicio);
    let rFin = convertirHoraAMinutos(r.hora_fin);
    if (rInicio === null || rFin === null) return null;
    if (rFin <= rInicio) rFin += 1440;
    return { inicio: rInicio, fin: rFin };
  }).filter(Boolean);

  const bloqueosNormalizados = bloqueos.map((b) => {
    const bInicio = convertirHoraAMinutos(b.hora_inicio);
    let bFin = convertirHoraAMinutos(b.hora_fin);
    if (bInicio === null || bFin === null) return null;
    if (bFin <= bInicio) bFin += 1440;
    return { inicio: bInicio, fin: bFin };
  }).filter(Boolean);

  for (let inicio = aperturaMin; inicio + Number(duracionMinutos) <= cierreMin; inicio += intervalo) {
    const fin = inicio + Number(duracionMinutos);

    // No permitimos turnos pasados (debe ser desde ahora, tomando cruce de medianoche)
    const inicioParaFecha = convertirMinutosAHora(inicio);
    const slotStart = new Date(`${fecha}T${inicioParaFecha}:00`);
    if (inicio >= 1440) slotStart.setDate(slotStart.getDate() + 1);
    if (slotStart.getTime() < now.getTime()) continue;

    const reservado = reservasNormalizadas.some((r) => intervalosSeSuperponen(inicio, fin, r.inicio, r.fin));
    if (reservado) continue;

    const bloqueado = bloqueosNormalizados.some((b) => intervalosSeSuperponen(inicio, fin, b.inicio, b.fin));
    if (bloqueado) continue;

    const hora_inicio = convertirMinutosAHora(inicio);
    const hora_fin = convertirMinutosAHora(fin);
    disponible.push({ cancha_id: cancha.id, cancha_nombre: cancha.nombre, hora_inicio, hora_fin });
  }

  return disponible;
}

async function calcularDisponibilidadPorHorario(fecha, duracionMinutos) {
  const canchas = await obtenerCanchasActivas();
  const resultMap = new Map();

  for (const cancha of canchas) {
    const disponibilidadCancha = await calcularDisponibilidad(cancha.id, fecha, duracionMinutos);
    for (const slot of disponibilidadCancha) {
      const key = slot.hora_inicio;
      if (!resultMap.has(key)) {
        resultMap.set(key, { hora_inicio: slot.hora_inicio, hora_fin: slot.hora_fin, canchas: [] });
      }
      const entry = resultMap.get(key);
      entry.canchas.push({ id: cancha.id, nombre: cancha.nombre });
      entry.cantidad_canchas = entry.canchas.length;
    }
  }

  const sorted = Array.from(resultMap.values()).sort((a, b) => {
    const aMin = convertirHoraAMinutos(a.hora_inicio);
    const bMin = convertirHoraAMinutos(b.hora_inicio);
    return aMin - bMin;
  });

  return sorted;
}

module.exports = { calcularDisponibilidad, calcularDisponibilidadPorHorario };
