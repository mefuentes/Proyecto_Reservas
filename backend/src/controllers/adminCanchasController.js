const db = require('../config/db');
const { esHoraValida } = require('../utils/validators');
const { dbBoolean, activeCondition } = require('../utils/dbHelpers');

function normalizarPayloadCancha(body = {}) {
  return {
    nombre: String(body.nombre || '').trim(),
    descripcion: String(body.descripcion || '').trim(),
    hora_apertura: String(body.hora_apertura || '').trim(),
    hora_cierre: String(body.hora_cierre || '').trim()
  };
}

function validarHorarioCancha(horaApertura, horaCierre) {
  if (!esHoraValida(horaApertura) || !esHoraValida(horaCierre)) {
    return 'Los horarios de apertura y cierre no son validos';
  }
  return null;
}

function obtenerHorarioBase(callback) {
  db.get(`SELECT hora_apertura, hora_cierre FROM configuracion ORDER BY id DESC LIMIT 1`, [], (err, row) => {
    if (err) return callback(err);
    return callback(null, {
      hora_apertura: row?.hora_apertura || '18:00',
      hora_cierre: row?.hora_cierre || '23:00'
    });
  });
}

function obtenerCompatibilidadHorarios(callback) {
  const dbDriver = (process.env.DB_DRIVER || 'sqlite').trim().toLowerCase();
  const isPostgres = dbDriver === 'postgres' || dbDriver === 'pg';

  if (isPostgres) {
    db.all(
      `SELECT column_name AS name FROM information_schema.columns WHERE table_name = $1`,
      ['canchas'],
      (err, rows) => {
        if (err) return callback(err);
        const columnas = new Set((rows || []).map((r) => r.name));
        const tieneHorarioApertura = columnas.has('hora_apertura');
        const tieneHorarioCierre = columnas.has('hora_cierre');
        return callback(null, { tieneHorarios: tieneHorarioApertura && tieneHorarioCierre });
      }
    );
  } else {
    db.all(`PRAGMA table_info(canchas)`, [], (err, rows) => {
      if (err) return callback(err);
      const columnas = new Set((rows || []).map((r) => r.name));
      const tieneHorarioApertura = columnas.has('hora_apertura');
      const tieneHorarioCierre = columnas.has('hora_cierre');
      return callback(null, { tieneHorarios: tieneHorarioApertura && tieneHorarioCierre });
    });
  }
}

const listarCanchas = (req, res) => {
  db.all(`SELECT * FROM canchas ORDER BY id ASC`, [], (err, rows) => {
    if (!err) return res.json({ ok: true, data: rows });

    if (!String(err.message || '').includes('no such table: canchas')) {
      return res.status(500).json({ ok: false, message: `Error al listar canchas: ${err.message}` });
    }

    db.run(
      `CREATE TABLE IF NOT EXISTS canchas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        activa INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      [],
      (createErr) => {
        if (createErr) return res.status(500).json({ ok: false, message: `Error al crear tabla canchas: ${createErr.message}` });
        db.all(`SELECT * FROM canchas ORDER BY id ASC`, [], (retryErr, retryRows) => {
          if (retryErr) return res.status(500).json({ ok: false, message: `Error al listar canchas: ${retryErr.message}` });
          return res.json({ ok: true, data: retryRows || [] });
        });
      }
    );
  });
};

const crearCancha = (req, res) => {
  const { nombre, descripcion, hora_apertura, hora_cierre } = normalizarPayloadCancha(req.body);
  if (!nombre) return res.status(400).json({ ok: false, message: 'El nombre es obligatorio' });
  obtenerHorarioBase((baseErr, horarioBase) => {
    if (baseErr) return res.status(500).json({ ok: false, message: 'Error al obtener horario base' });
    const apertura = hora_apertura || horarioBase.hora_apertura;
    const cierre = hora_cierre || horarioBase.hora_cierre;
    const errorHorario = validarHorarioCancha(apertura, cierre);
    if (errorHorario) return res.status(400).json({ ok: false, message: errorHorario });

    db.get(`SELECT id FROM canchas WHERE UPPER(nombre) = UPPER(?)`, [nombre], (selErr, row) => {
      if (selErr) return res.status(500).json({ ok: false, message: 'Error al validar cancha existente' });
      if (row) return res.status(400).json({ ok: false, message: 'Ya existe una cancha con ese nombre' });
      obtenerCompatibilidadHorarios((schemaErr, compat) => {
        if (schemaErr) return res.status(500).json({ ok: false, message: 'Error al validar esquema de canchas' });

        const activaValor = dbBoolean(true);
      const sql = compat.tieneHorarios
        ? `INSERT INTO canchas (nombre, descripcion, hora_apertura, hora_cierre, activa) VALUES (?, ?, ?, ?, ?)`
        : `INSERT INTO canchas (nombre, descripcion, activa) VALUES (?, ?, ?)`;
      const params = compat.tieneHorarios
        ? [nombre, descripcion || null, apertura, cierre, activaValor]
        : [nombre, descripcion || null, activaValor];

      db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ ok: false, message: `Error al crear cancha: ${err.message}` });
        return res.status(201).json({ ok: true, message: 'Cancha creada correctamente', data: { id: this.lastID, nombre, descripcion: descripcion || null, hora_apertura: apertura, hora_cierre: cierre, activa: activaValor } });
      });
      });
    });
  });
};

const editarCancha = (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, hora_apertura, hora_cierre } = normalizarPayloadCancha(req.body);
  if (!nombre) return res.status(400).json({ ok: false, message: 'El nombre es obligatorio' });
  db.get(`SELECT * FROM canchas WHERE id = ?`, [id], (findErr, canchaActual) => {
    if (findErr) return res.status(500).json({ ok: false, message: 'Error al obtener la cancha' });
    if (!canchaActual) return res.status(404).json({ ok: false, message: 'Cancha no encontrada' });

    const apertura = hora_apertura || canchaActual.hora_apertura || '18:00';
    const cierre = hora_cierre || canchaActual.hora_cierre || '23:00';
    const errorHorario = validarHorarioCancha(apertura, cierre);
    if (errorHorario) return res.status(400).json({ ok: false, message: errorHorario });

    db.get(`SELECT id FROM canchas WHERE UPPER(nombre) = UPPER(?) AND id <> ?`, [nombre, id], (selErr, row) => {
      if (selErr) return res.status(500).json({ ok: false, message: 'Error al validar cancha existente' });
      if (row) return res.status(400).json({ ok: false, message: 'Ya existe otra cancha con ese nombre' });
      obtenerCompatibilidadHorarios((schemaErr, compat) => {
        if (schemaErr) return res.status(500).json({ ok: false, message: 'Error al validar esquema de canchas' });

        const sql = compat.tieneHorarios
          ? `UPDATE canchas SET nombre = ?, descripcion = ?, hora_apertura = ?, hora_cierre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
          : `UPDATE canchas SET nombre = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        const params = compat.tieneHorarios
          ? [nombre, descripcion || null, apertura, cierre, id]
          : [nombre, descripcion || null, id];

        db.run(sql, params, function (err) {
          if (err) return res.status(500).json({ ok: false, message: `Error al editar cancha: ${err.message}` });
          if (this.changes === 0) return res.status(404).json({ ok: false, message: 'Cancha no encontrada' });
          return res.json({ ok: true, message: 'Cancha actualizada correctamente' });
        });
      });
    });
  });
};

const cambiarEstadoCancha = (req, res) => {
  const { id } = req.params;
  const activa = dbBoolean(req.body?.activa);
  db.run(`UPDATE canchas SET activa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [activa, id], function (err) {
    if (err) return res.status(500).json({ ok: false, message: `Error al cambiar estado de la cancha: ${err.message}` });
    if (this.changes === 0) return res.status(404).json({ ok: false, message: 'Cancha no encontrada' });
    return res.json({ ok: true, message: 'Estado de la cancha actualizado' });
  });
};

module.exports = { listarCanchas, crearCancha, editarCancha, cambiarEstadoCancha };
