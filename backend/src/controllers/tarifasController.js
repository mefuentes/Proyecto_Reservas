const db = require('../config/db');
const { calcularPrecio } = require('../services/tarifasService');
const { dbBoolean } = require('../utils/dbHelpers');

const listarTarifas = (req, res) => {
  db.all(
    `SELECT t.*, c.nombre AS cancha_nombre FROM tarifas t LEFT JOIN canchas c ON c.id = t.cancha_id ORDER BY t.cancha_id IS NOT NULL DESC, c.nombre ASC, t.duracion_minutos ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, message: 'Error al listar tarifas' });
      return res.json({ ok: true, data: rows });
    }
  );
};

const crearTarifa = (req, res) => {
  const { cancha_id, duracion_minutos, precio_base, adicional_luz, activa } = req.body;
  if (!duracion_minutos || precio_base == null || adicional_luz == null) {
    return res.status(400).json({ ok: false, message: 'Faltan datos obligatorios de tarifa' });
  }
  db.run(
    `INSERT INTO tarifas (cancha_id, duracion_minutos, precio_base, adicional_luz, activa) VALUES (?, ?, ?, ?, ?)`,
    [cancha_id || null, Number(duracion_minutos), Number(precio_base), Number(adicional_luz), dbBoolean(activa)],
    function (err) {
      if (err) return res.status(500).json({ ok: false, message: 'Error al crear tarifa' });
      return res.status(201).json({ ok: true, message: 'Tarifa creada correctamente', data: { id: this.lastID } });
    }
  );
};

const actualizarTarifa = (req, res) => {
  const { id } = req.params;
  const { cancha_id, duracion_minutos, precio_base, adicional_luz, activa } = req.body;
  db.run(
    `UPDATE tarifas SET cancha_id = ?, duracion_minutos = ?, precio_base = ?, adicional_luz = ?, activa = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [cancha_id || null, Number(duracion_minutos), Number(precio_base), Number(adicional_luz), dbBoolean(activa), id],
    function (err) {
      if (err) return res.status(500).json({ ok: false, message: 'Error al actualizar tarifa' });
      if (this.changes === 0) return res.status(404).json({ ok: false, message: 'Tarifa no encontrada' });
      return res.json({ ok: true, message: 'Tarifa actualizada correctamente' });
    }
  );
};

const eliminarTarifa = (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM tarifas WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ ok: false, message: 'Error al eliminar tarifa' });
    if (this.changes === 0) return res.status(404).json({ ok: false, message: 'Tarifa no encontrada' });
    return res.json({ ok: true, message: 'Tarifa eliminada correctamente' });
  });
};

const calcularTarifaPublica = async (req, res) => {
  try {
    const { cancha_id, duracion, con_luz } = req.query;
    if (!cancha_id || !duracion) return res.status(400).json({ ok: false, message: 'cancha_id y duracion son obligatorios' });
    const data = await calcularPrecio(Number(cancha_id), Number(duracion), Number(con_luz) === 1 || String(con_luz) === 'true');
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al calcular tarifa' });
  }
};

module.exports = { listarTarifas, crearTarifa, actualizarTarifa, eliminarTarifa, calcularTarifaPublica };
