function convertirHoraAMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function convertirMinutosAHora(minutos) {
  const normalizado = ((Number(minutos) % 1440) + 1440) % 1440;
  const horas = Math.floor(normalizado / 60).toString().padStart(2, '0');
  const mins = (normalizado % 60).toString().padStart(2, '0');
  return `${horas}:${mins}`;
}

function sumarMinutosAHora(hora, minutosASumar) {
  const total = convertirHoraAMinutos(hora) + minutosASumar;
  return convertirMinutosAHora(total);
}

function intervalosSeSuperponen(inicioA, finA, inicioB, finB) {
  const generarRangos = (inicio, fin) => {
    const s = convertirHoraAMinutos(inicio);
    let e = convertirHoraAMinutos(fin);
    if (e <= s) e += 1440;
    return [[s, e], [s + 1440, e + 1440], [s - 1440, e - 1440]];
  };

  const rangosA = generarRangos(inicioA, finA);
  const rangosB = generarRangos(inicioB, finB);

  return rangosA.some(([aInicio, aFin]) => rangosB.some(([bInicio, bFin]) => aInicio < bFin && bInicio < aFin));
}

function convertirFechaHoraATimestamp(fecha, hora) {
  return new Date(`${fecha}T${hora}:00`).getTime();
}

function minutosHastaReserva(fecha, hora) {
  const ahora = Date.now();
  const fechaReserva = convertirFechaHoraATimestamp(fecha, hora);
  const diferenciaMs = fechaReserva - ahora;
  return diferenciaMs / (1000 * 60);
}

function faltanMasDeMinutosParaReserva(fecha, hora, minutosMinimos) {
  return minutosHastaReserva(fecha, hora) > minutosMinimos;
}

function cumpleAnticipacionMinima(fecha, hora, minutosMinimos) {
  return minutosHastaReserva(fecha, hora) >= Number(minutosMinimos || 0);
}

function esFechaHoraFuturaOVigente(fecha, hora) {
  return convertirFechaHoraATimestamp(fecha, hora) >= Date.now();
}

function esFechaHoraPosteriorActual(fecha, hora) {
  return convertirFechaHoraATimestamp(fecha, hora) > Date.now();
}

module.exports = {
  convertirHoraAMinutos,
  convertirMinutosAHora,
  sumarMinutosAHora,
  intervalosSeSuperponen,
  convertirFechaHoraATimestamp,
  minutosHastaReserva,
  faltanMasDeMinutosParaReserva,
  cumpleAnticipacionMinima,
  esFechaHoraFuturaOVigente,
  esFechaHoraPosteriorActual
};
