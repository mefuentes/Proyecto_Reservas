const DURACIONES_VALIDAS = [60, 90, 120, 150, 180];

const esFechaValida = (fecha) => /^\d{4}-\d{2}-\d{2}$/.test(fecha);
const esHoraValida = (hora) => /^\d{2}:\d{2}$/.test(hora);
const esDuracionValida = (duracion) => DURACIONES_VALIDAS.includes(Number(duracion));

module.exports = {
  DURACIONES_VALIDAS,
  esFechaValida,
  esHoraValida,
  esDuracionValida
};
