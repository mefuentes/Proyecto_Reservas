const db = require('../config/db');
const { activeCondition } = require('../utils/dbHelpers');

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function obtenerTarifa(canchaId, duracionMinutos) {
  const especifica = await dbGet(
    `SELECT * FROM tarifas WHERE cancha_id = ? AND duracion_minutos = ? AND activa ${activeCondition(true)} ORDER BY id DESC LIMIT 1`,
    [canchaId, duracionMinutos]
  );
  if (especifica) return especifica;
  return dbGet(
    `SELECT * FROM tarifas WHERE cancha_id IS NULL AND duracion_minutos = ? AND activa ${activeCondition(true)} ORDER BY id DESC LIMIT 1`,
    [duracionMinutos]
  );
}

async function calcularPrecioReserva(canchaId, duracionMinutos, conLuz) {
  const tarifa = await obtenerTarifa(canchaId, duracionMinutos);
  if (!tarifa) {
    return { precio_base: 0, adicional_luz: 0, precio_total: 0, tarifa: null };
  }
  const precio_base = Number(tarifa.precio_base || 0);
  const adicional_luz = conLuz ? Number(tarifa.adicional_luz || 0) : 0;
  return {
    precio_base,
    adicional_luz,
    precio_total: precio_base + adicional_luz,
    tarifa
  };
}

module.exports = { obtenerTarifa, calcularPrecioReserva };
