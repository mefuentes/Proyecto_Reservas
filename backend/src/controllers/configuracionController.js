const db = require('../config/db');

const obtenerConfiguracion = (req, res) => {
  const sql = `
    SELECT
      hora_apertura,
      hora_cierre,
      intervalo_minutos,
      duraciones_habilitadas,
      anticipacion_minima,
      telefono_club,
      logo_url,
      mensaje_confirmacion,
      minutos_minimos_cancelacion_cliente,
      horas_minimas_cancelacion_cliente,
      horas_minimas_reprogramacion_cliente
    FROM configuracion
    ORDER BY id DESC
    LIMIT 1
  `;

  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json({ ok: false, message: 'Error al obtener configuración' });
    res.json({ ok: true, data: row });
  });
};

module.exports = { obtenerConfiguracion };
