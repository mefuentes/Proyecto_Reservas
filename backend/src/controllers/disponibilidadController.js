const { esFechaValida, esDuracionValida } = require('../utils/validators');
const { calcularDisponibilidad, calcularDisponibilidadPorHorario } = require('../services/disponibilidadService');
const db = require('../config/db');

function obtenerConfiguracion() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT anticipacion_minima FROM configuracion ORDER BY id DESC LIMIT 1`, [], (err, row) => err ? reject(err) : resolve(row || { anticipacion_minima: 0 }));
  });
}

function obtenerCanchaHorario(canchaId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT hora_apertura, hora_cierre FROM canchas WHERE id = ?`, [canchaId], (err, row) => err ? reject(err) : resolve(row || null));
  });
}

function esHorarioVigente(fecha, horaInicio, horaApertura, horaCierre) {
  const inicio = new Date(`${fecha}T${horaInicio}:00`);
  if (horaApertura && horaCierre && horaCierre <= horaApertura && horaInicio < horaApertura) {
    inicio.setDate(inicio.getDate() + 1);
  }
  return inicio.getTime() >= Date.now();
}

function cumpleAnticipacionOperativa(fecha, horaInicio, anticipacion, horaApertura, horaCierre) {
  const inicio = new Date(`${fecha}T${horaInicio}:00`);
  if (horaApertura && horaCierre && horaCierre <= horaApertura && horaInicio < horaApertura) {
    inicio.setDate(inicio.getDate() + 1);
  }
  const diffMin = (inicio.getTime() - Date.now()) / (1000 * 60);
  return diffMin >= Number(anticipacion || 0);
}

function filtrarPorAnticipacion(horarios, fecha, anticipacion, canchaHorario = null) {
  return horarios
    .map((horario) => {
      if (Array.isArray(horario.canchas)) {
        const canchas = horario.canchas.filter((cancha) => cumpleAnticipacionOperativa(fecha, horario.hora_inicio, anticipacion, cancha.hora_apertura, cancha.hora_cierre));
        if (!canchas.length) return null;
        return { ...horario, canchas, cantidad_canchas: canchas.length };
      }
      return cumpleAnticipacionOperativa(fecha, horario.hora_inicio, anticipacion, canchaHorario?.hora_apertura, canchaHorario?.hora_cierre) ? horario : null;
    })
    .filter(Boolean);
}

function filtrarHorariosPasados(horarios, fecha, canchaHorario = null) {
  return horarios
    .map((horario) => {
      if (Array.isArray(horario.canchas)) {
        const canchasVigentes = (horario.canchas || []).filter((cancha) => esHorarioVigente(fecha, horario.hora_inicio, cancha.hora_apertura, cancha.hora_cierre));
        if (!canchasVigentes.length) return null;
        return { ...horario, canchas: canchasVigentes, cantidad_canchas: canchasVigentes.length };
      }
      const vigente = esHorarioVigente(fecha, horario.hora_inicio, canchaHorario?.hora_apertura, canchaHorario?.hora_cierre);
      if (!vigente) return null;
      return horario;
    })
    .filter(Boolean);
}

const obtenerDisponibilidad = async (req, res) => {
  try {
    const { fecha, cancha_id, duracion, aplicar_anticipacion = '0' } = req.query;
    if (!fecha || !duracion) {
      return res.status(400).json({ ok: false, message: 'Faltan parámetros obligatorios' });
    }
    if (!esFechaValida(fecha)) return res.status(400).json({ ok: false, message: 'La fecha es inválida' });
    if (!esDuracionValida(duracion)) return res.status(400).json({ ok: false, message: 'La duración no es válida' });

    let horarios = cancha_id
      ? await calcularDisponibilidad(Number(cancha_id), fecha, Number(duracion))
      : await calcularDisponibilidadPorHorario(fecha, Number(duracion));

    const canchaHorario = cancha_id ? await obtenerCanchaHorario(Number(cancha_id)) : null;
    horarios = filtrarHorariosPasados(horarios, fecha, canchaHorario);

    if (aplicar_anticipacion === '1') {
      const config = await obtenerConfiguracion();
      const anticipacion = Number(config?.anticipacion_minima || 0);
      if (anticipacion > 0) {
        horarios = filtrarPorAnticipacion(horarios, fecha, anticipacion, canchaHorario);
      }
    }

    return res.json({ ok: true, data: horarios });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al calcular disponibilidad' });
  }
};

module.exports = { obtenerDisponibilidad };
