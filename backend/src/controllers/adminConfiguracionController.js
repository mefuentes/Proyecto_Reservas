const db = require('../config/db');

const obtenerConfiguracionAdmin = (req, res) => {
  db.get(`SELECT * FROM configuracion ORDER BY id DESC LIMIT 1`, [], (err, row) => {
    if (err) return res.status(500).json({ ok: false, message: 'Error al obtener configuracion' });
    return res.json({ ok: true, data: row || null });
  });
};

const actualizarConfiguracion = (req, res) => {
  const {
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
  } = req.body || {};

  if (!intervalo_minutos || !duraciones_habilitadas) {
    return res.status(400).json({ ok: false, message: 'Faltan datos obligatorios de configuracion' });
  }

  db.get(`SELECT * FROM configuracion ORDER BY id DESC LIMIT 1`, [], (selErr, row) => {
    if (selErr) return res.status(500).json({ ok: false, message: 'Error al validar configuracion' });

    const aperturaFinal = hora_apertura || row?.hora_apertura || '18:00';
    const cierreFinal = hora_cierre || row?.hora_cierre || '23:00';
    const params = [
      aperturaFinal,
      cierreFinal,
      Number(intervalo_minutos),
      String(duraciones_habilitadas),
      Number(anticipacion_minima || 0),
      telefono_club || null,
      logo_url || null,
      mensaje_confirmacion || null,
      Number(minutos_minimos_cancelacion_cliente ?? Number(horas_minimas_cancelacion_cliente ?? 3) * 60),
      Number(horas_minimas_cancelacion_cliente ?? 3),
      Number(horas_minimas_reprogramacion_cliente ?? 3)
    ];

    const sql = row
      ? `UPDATE configuracion SET hora_apertura = ?, hora_cierre = ?, intervalo_minutos = ?, duraciones_habilitadas = ?, anticipacion_minima = ?, telefono_club = ?, logo_url = ?, mensaje_confirmacion = ?, minutos_minimos_cancelacion_cliente = ?, horas_minimas_cancelacion_cliente = ?, horas_minimas_reprogramacion_cliente = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      : `INSERT INTO configuracion (hora_apertura, hora_cierre, intervalo_minutos, duraciones_habilitadas, anticipacion_minima, telefono_club, logo_url, mensaje_confirmacion, minutos_minimos_cancelacion_cliente, horas_minimas_cancelacion_cliente, horas_minimas_reprogramacion_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    if (row) {
      params.push(row.id);
    }

    const cleanDuplicateRows = (currentId) => {
      if (!currentId) return;
      db.run('DELETE FROM configuracion WHERE id <> ?', [currentId], (delErr) => {
        if (delErr) {
          console.warn('No se pudieron eliminar configuraciones extra:', delErr.message);
        }
      });
    };

    db.run(sql, params, function (err) {
      if (err) return res.status(500).json({ ok: false, message: `Error al actualizar configuracion: ${err.message}` });

      if (row && row.id) {
        cleanDuplicateRows(row.id);
        return res.json({ ok: true, message: 'Configuracion actualizada correctamente' });
      }

      // Si se insertó, limpia duplicados conservando el más nuevo.
      db.get('SELECT id FROM configuracion ORDER BY id DESC LIMIT 1', [], (getErr, latest) => {
        if (!getErr && latest?.id) {
          cleanDuplicateRows(latest.id);
        }
        return res.json({ ok: true, message: 'Configuracion actualizada correctamente' });
      });
    });
  });
};

module.exports = { obtenerConfiguracionAdmin, actualizarConfiguracion };
