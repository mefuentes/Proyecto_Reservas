const db = require('../config/db');
const { esFechaValida, esHoraValida } = require('../utils/validators');
const { activeCondition } = require('../utils/dbHelpers');

function validarBloqueoPayload(body) {
  const { cancha_id, tipo, hora_inicio, hora_fin, fecha, dia_semana, fecha_desde, fecha_hasta } = body;

  // cancha_id puede ser null solo para bloqueos semanales (afecta todas las canchas)
  if (tipo !== 'semanal' && (cancha_id === null || cancha_id === undefined || cancha_id === '')) {
    return 'Faltan datos obligatorios';
  }

  if (!tipo || !hora_inicio || !hora_fin) {
    return 'Faltan datos obligatorios';
  }

  if (!esHoraValida(hora_inicio) || !esHoraValida(hora_fin)) {
    return 'Horas inválidas';
  }

  if (tipo === 'fecha' && !esFechaValida(fecha)) {
    return 'Fecha inválida';
  }

  if (tipo === 'semanal' && (dia_semana === null || dia_semana === undefined || dia_semana === '')) {
    return 'Día de semana inválido';
  }

  if (tipo === 'rango' && (!esFechaValida(fecha_desde) || !esFechaValida(fecha_hasta) || fecha_desde > fecha_hasta)) {
    return 'Rango de fechas inválido';
  }

  return null;
}

function formatearDiaSemana(diaSemana) {
  if (Array.isArray(diaSemana)) return diaSemana.join(',');
  if (typeof diaSemana === 'number' || typeof diaSemana === 'string') return String(diaSemana);
  return null;
}

const listarBloqueosPorFecha = (req, res) => {
  const { fecha, cancha_id, todos } = req.query;

  // Si no se especifica fecha y no es "todos", requerir fecha
  if (!todos && (!fecha || !esFechaValida(fecha))) {
    return res.status(400).json({ ok: false, message: 'Fecha inválida' });
  }

  let sql = `SELECT b.*, c.nombre AS cancha_nombre FROM bloqueos_horarios b LEFT JOIN canchas c ON c.id = b.cancha_id WHERE b.activo ${activeCondition(true)}`;
  const params = [];

  if (fecha && esFechaValida(fecha)) {
    sql += ` AND (`;
    sql += ` (b.tipo = 'fecha' AND b.fecha = ?)`;
    params.push(fecha);

    const diaSemana = new Date(`${fecha}T00:00:00`).getDay() || 7;
    sql += ` OR (b.tipo = 'semanal' AND b.dia_semana LIKE ?)`;
    params.push(`%${diaSemana}%`);

    sql += ` OR (b.tipo = 'rango' AND b.fecha_desde <= ? AND b.fecha_hasta >= ?)`;
    params.push(fecha, fecha);

    sql += `)`;
  }

  if (cancha_id) {
    sql += ' AND (b.cancha_id = ? OR b.cancha_id IS NULL)';
    params.push(Number(cancha_id));
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ ok: false, message: 'Error al listar bloqueos' });
    return res.json({ ok: true, data: rows || [] });
  });
};

const crearBloqueo = (req, res) => {
  const error = validarBloqueoPayload(req.body);
  if (error) return res.status(400).json({ ok: false, message: error });

  const {
    cancha_id,
    grupo_bloqueo,
    cliente_id,
    documento_cliente,
    fecha,
    tipo,
    dia_semana,
    fecha_desde,
    fecha_hasta,
    hora_inicio,
    hora_fin,
    motivo
  } = req.body;

  const diaSemanaFormateado = formatearDiaSemana(dia_semana);

  db.run(
    `INSERT INTO bloqueos_horarios (cancha_id, grupo_bloqueo, cliente_id, documento_cliente, fecha, tipo, dia_semana, fecha_desde, fecha_hasta, activo, hora_inicio, hora_fin, motivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cancha_id === 0 ? null : Number(cancha_id),
      grupo_bloqueo || null,
      cliente_id || null,
      documento_cliente || null,
      fecha || null,
      tipo,
      diaSemanaFormateado,
      fecha_desde || null,
      fecha_hasta || null,
      true,
      hora_inicio,
      hora_fin,
      motivo || null
    ],
    function (err) {
      if (err) {
        console.error('Error al crear bloqueo:', err);
        return res.status(500).json({ ok: false, message: 'Error al crear bloqueo' });
      }
      return res.status(201).json({ ok: true, message: 'Bloqueo creado', data: { id: this.lastID } });
    }
  );
};

const actualizarBloqueo = (req, res) => {
  const { id } = req.params;
  const error = validarBloqueoPayload(req.body);
  if (error) return res.status(400).json({ ok: false, message: error });

  const {
    cancha_id,
    grupo_bloqueo,
    cliente_id,
    documento_cliente,
    fecha,
    tipo,
    dia_semana,
    fecha_desde,
    fecha_hasta,
    activo,
    hora_inicio,
    hora_fin,
    motivo
  } = req.body;

  const diaSemanaFormateado = formatearDiaSemana(dia_semana);

  db.run(
    `UPDATE bloqueos_horarios SET cancha_id = ?, grupo_bloqueo = ?, cliente_id = ?, documento_cliente = ?, fecha = ?, tipo = ?, dia_semana = ?, fecha_desde = ?, fecha_hasta = ?, activo = ?, hora_inicio = ?, hora_fin = ?, motivo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [
      cancha_id === 0 ? null : Number(cancha_id),
      grupo_bloqueo || null,
      cliente_id || null,
      documento_cliente || null,
      fecha || null,
      tipo,
      diaSemanaFormateado,
      fecha_desde || null,
      fecha_hasta || null,
      activo === false ? false : true,
      hora_inicio,
      hora_fin,
      motivo || null,
      Number(id)
    ],
    function (err) {
      if (err) return res.status(500).json({ ok: false, message: 'Error al actualizar bloqueo' });
      if (this.changes === 0) return res.status(404).json({ ok: false, message: 'Bloqueo no encontrado' });
      return res.json({ ok: true, message: 'Bloqueo actualizado' });
    }
  );
};

const eliminarBloqueo = (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE bloqueos_horarios SET activo = ? WHERE id = ?`, [false, Number(id)], function (err) {
    if (err) return res.status(500).json({ ok: false, message: 'Error al eliminar bloqueo' });
    if (this.changes === 0) return res.status(404).json({ ok: false, message: 'Bloqueo no encontrado' });
    return res.json({ ok: true, message: 'Bloqueo eliminado' });
  });
};

module.exports = { listarBloqueosPorFecha, crearBloqueo, actualizarBloqueo, eliminarBloqueo };

