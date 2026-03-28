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
  let tarifa = await dbGet(
    `SELECT * FROM tarifas WHERE activa ${activeCondition(true)} AND cancha_id = ? AND duracion_minutos = ? ORDER BY id DESC LIMIT 1`,
    [canchaId, duracionMinutos]
  );

  if (!tarifa) {
    tarifa = await dbGet(
      `SELECT * FROM tarifas WHERE activa ${activeCondition(true)} AND cancha_id IS NULL AND duracion_minutos = ? ORDER BY id DESC LIMIT 1`,
      [duracionMinutos]
    );
  }

  if (!tarifa) {
    return {
      precio_base: 0,
      adicional_luz: 0,
      precio_total: 0,
      tarifa_id: null
    };
  }

  return {
    tarifa_id: tarifa.id,
    precio_base: Number(tarifa.precio_base || 0),
    adicional_luz: Number(tarifa.adicional_luz || 0)
  };
}

async function calcularPrecio(canchaId, duracionMinutos, conLuz) {
  const tarifa = await obtenerTarifa(canchaId, duracionMinutos);
  const adicional = conLuz ? tarifa.adicional_luz : 0;
  return {
    tarifa_id: tarifa.tarifa_id,
    precio_base: tarifa.precio_base,
    adicional_luz: adicional,
    precio_total: tarifa.precio_base + adicional
  };
}

module.exports = {
  obtenerTarifa,
  calcularPrecio
};
