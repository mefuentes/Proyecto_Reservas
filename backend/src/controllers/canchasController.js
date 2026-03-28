const db = require('../config/db');
const { activeCondition } = require('../utils/dbHelpers');

const obtenerCanchasActivas = (req, res) => {
  db.all(`SELECT id, nombre, descripcion, hora_apertura, hora_cierre FROM canchas WHERE activa ${activeCondition(true)} ORDER BY nombre ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, message: 'Error al obtener canchas' });
    return res.json({ ok: true, data: rows });
  });
};

module.exports = { obtenerCanchasActivas };
