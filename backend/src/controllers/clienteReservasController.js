const db = require('../config/db');
const { esFechaValida, esHoraValida, esDuracionValida } = require('../utils/validators');
const { faltanMasDeMinutosParaReserva, sumarMinutosAHora, esFechaHoraFuturaOVigente } = require('../utils/datetime');
const { calcularDisponibilidad } = require('../services/disponibilidadService');
const { calcularPrecio } = require('../services/tarifasService');
const whatsappService = require('../services/whatsappService');
const { normalizarDocumento, normalizarTelefono } = require('../services/clientesService');

function obtenerReservaPorIdYDocumento(id, documento) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT r.*, c.nombre AS cancha_nombre FROM reservas r INNER JOIN canchas c ON c.id = r.cancha_id WHERE r.id = ? AND r.documento_cliente = ?`, [id, documento], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function obtenerHorasConfigCancelacion() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT horas_minimas_cancelacion_cliente FROM configuracion ORDER BY id ASC LIMIT 1`, [], (err, row) => (
      err ? reject(err) : resolve(row?.horas_minimas_cancelacion_cliente == null ? 3 : Number(row.horas_minimas_cancelacion_cliente))
    ));
  });
}

function obtenerHorasConfigReprogramacion() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT horas_minimas_reprogramacion_cliente FROM configuracion ORDER BY id ASC LIMIT 1`, [], (err, row) => (
      err ? reject(err) : resolve(row?.horas_minimas_reprogramacion_cliente == null ? 3 : Number(row.horas_minimas_reprogramacion_cliente))
    ));
  });
}

const buscarReservasCliente = (req, res) => {
  const documento = normalizarDocumento(req.query.documento);
  const { fecha } = req.query;
  if (!documento || !fecha) return res.status(400).json({ ok: false, message: 'Documento y fecha son obligatorios' });
  if (!esFechaValida(fecha)) return res.status(400).json({ ok: false, message: 'La fecha es invalida' });

  const sql = `SELECT r.id, r.cancha_id, r.documento_cliente, c.nombre AS cancha_nombre, r.fecha, r.hora_inicio, r.hora_fin, r.duracion_minutos, r.nombre_cliente, r.telefono_cliente, r.estado, r.origen, r.observaciones, r.con_luz, r.precio_total FROM reservas r INNER JOIN canchas c ON c.id = r.cancha_id WHERE r.documento_cliente = ? AND r.fecha = ? ORDER BY r.hora_inicio ASC`;
  db.all(sql, [documento, fecha], (err, rows) => (
    err
      ? res.status(500).json({ ok: false, message: 'Error al buscar reservas' })
      : res.json({ ok: true, data: rows || [] })
  ));
};

const cancelarReservaCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const documento = normalizarDocumento(req.body.documento);
    if (!documento) return res.status(400).json({ ok: false, message: 'El documento es obligatorio' });

    const reserva = await obtenerReservaPorIdYDocumento(id, documento);
    if (!reserva) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    if (reserva.estado === 'cancelada') return res.status(400).json({ ok: false, message: 'La reserva ya se encuentra cancelada' });
    if (!esFechaHoraFuturaOVigente(reserva.fecha, reserva.hora_inicio)) {
      return res.status(400).json({ ok: false, message: 'No es posible realizar acciones sobre reservas anteriores a la fecha y hora actual.' });
    }

    const horasMinimas = await obtenerHorasConfigCancelacion();
    const minutosMinimos = Number(horasMinimas) * 60;
    if (!faltanMasDeMinutosParaReserva(reserva.fecha, reserva.hora_inicio, minutosMinimos)) {
      return res.status(400).json({ ok: false, message: `No es posible cancelar el turno por no cumplir con el tiempo minimo definido por el club (${horasMinimas} horas).` });
    }

    db.run(`UPDATE reservas SET estado = 'cancelada', cancelado_por_tipo = 'cliente', cancelado_por_nombre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [reserva.nombre_cliente || 'Cliente', id], async (updateErr) => {
      if (updateErr) return res.status(500).json({ ok: false, message: 'Error al cancelar la reserva' });
      try {
        const tel = normalizarTelefono(reserva.telefono_cliente || '');
        let telefonoWhatsapp = tel;
        if (!telefonoWhatsapp.startsWith('whatsapp:') && telefonoWhatsapp.startsWith('+')) telefonoWhatsapp = `whatsapp:${telefonoWhatsapp}`;
        if (telefonoWhatsapp.startsWith('whatsapp:+')) {
          await whatsappService.enviarCancelacionReserva({
            telefono: telefonoWhatsapp,
            cancha: reserva.cancha_nombre,
            fecha: reserva.fecha,
            hora_inicio: reserva.hora_inicio,
            hora_fin: reserva.hora_fin
          });
        }
      } catch {}
      return res.json({ ok: true, message: 'Reserva cancelada correctamente' });
    });
  } catch {
    return res.status(500).json({ ok: false, message: 'Error al cancelar la reserva' });
  }
};

const reprogramarReservaCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { documento, nueva_fecha, nueva_cancha_id, nueva_hora_inicio, nueva_duracion_minutos, con_luz } = req.body;
    const documentoNormalizado = normalizarDocumento(documento);

    if (!documentoNormalizado || !nueva_fecha || !nueva_cancha_id || !nueva_hora_inicio || !nueva_duracion_minutos) {
      return res.status(400).json({ ok: false, message: 'Faltan datos obligatorios para reprogramar' });
    }
    if (!esFechaValida(nueva_fecha) || !esHoraValida(nueva_hora_inicio) || !esDuracionValida(nueva_duracion_minutos)) {
      return res.status(400).json({ ok: false, message: 'Datos invalidos para la reprogramacion' });
    }
    if (!esFechaHoraFuturaOVigente(nueva_fecha, nueva_hora_inicio)) {
      return res.status(400).json({ ok: false, message: 'No es posible reprogramar a una fecha u horario anterior al actual.' });
    }

    const reserva = await obtenerReservaPorIdYDocumento(id, documentoNormalizado);
    if (!reserva) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    if (reserva.estado !== 'confirmada') return res.status(400).json({ ok: false, message: 'Solo se pueden reprogramar reservas confirmadas' });

    const horasMinimas = await obtenerHorasConfigReprogramacion();
    const minutosMinimos = Number(horasMinimas) * 60;
    if (!faltanMasDeMinutosParaReserva(reserva.fecha, reserva.hora_inicio, minutosMinimos)) {
      return res.status(400).json({ ok: false, message: `No es posible reprogramar el turno por no cumplir con el tiempo minimo definido por el club (${horasMinimas} horas).` });
    }

    const horariosDisponibles = await calcularDisponibilidad(Number(nueva_cancha_id), nueva_fecha, Number(nueva_duracion_minutos), { excludeReservaId: Number(id) });
    const horarioValido = horariosDisponibles.find((h) => h.hora_inicio === nueva_hora_inicio);
    if (!horarioValido) return res.status(409).json({ ok: false, message: 'El nuevo horario seleccionado no esta disponible' });

    const precio = await calcularPrecio(Number(nueva_cancha_id), Number(nueva_duracion_minutos), Boolean(con_luz));
    const nuevaHoraFin = sumarMinutosAHora(nueva_hora_inicio, Number(nueva_duracion_minutos));

    db.run(`UPDATE reservas SET estado = 'reprogramada', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], (cancelErr) => {
      if (cancelErr) return res.status(500).json({ ok: false, message: 'Error al marcar la reserva original' });

      db.run(
        `INSERT INTO reservas (cancha_id, cliente_id, documento_cliente, fecha, hora_inicio, hora_fin, duracion_minutos, nombre_cliente, telefono_cliente, estado, origen, observaciones, con_luz, precio_base_aplicado, adicional_luz_aplicado, precio_total, reserva_original_id, motivo_cambio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', 'web', ?, ?, ?, ?, ?, ?, 'Reprogramacion de cliente')`,
        [Number(nueva_cancha_id), reserva.cliente_id, documentoNormalizado, nueva_fecha, nueva_hora_inicio, nuevaHoraFin, Number(nueva_duracion_minutos), reserva.nombre_cliente, reserva.telefono_cliente, reserva.observaciones || null, Boolean(con_luz) ? 1 : 0, precio.precio_base, precio.adicional_luz, precio.precio_total, reserva.id],
        async function (insertErr) {
          if (insertErr) return res.status(500).json({ ok: false, message: 'Error al crear la nueva reserva' });
          try {
            const tel = normalizarTelefono(reserva.telefono_cliente || '');
            let telefonoWhatsapp = tel;
            if (!telefonoWhatsapp.startsWith('whatsapp:') && telefonoWhatsapp.startsWith('+')) telefonoWhatsapp = `whatsapp:${telefonoWhatsapp}`;
            if (telefonoWhatsapp.startsWith('whatsapp:+')) {
              const canchaRow = await new Promise((resolve) => db.get(`SELECT nombre FROM canchas WHERE id = ?`, [nueva_cancha_id], (_, row) => resolve(row)));
              await whatsappService.enviarReprogramacionReserva({
                telefono: telefonoWhatsapp,
                cancha: canchaRow?.nombre || `Cancha ${nueva_cancha_id}`,
                fecha: nueva_fecha,
                hora_inicio: nueva_hora_inicio,
                hora_fin: nuevaHoraFin,
                con_luz: Boolean(con_luz),
                precio_total: precio.precio_total
              });
            }
          } catch {}
          return res.json({
            ok: true,
            message: 'Reserva reprogramada correctamente',
            data: {
              id: this.lastID,
              fecha: nueva_fecha,
              hora_inicio: nueva_hora_inicio,
              hora_fin: nuevaHoraFin,
              duracion_minutos: Number(nueva_duracion_minutos),
              con_luz: Boolean(con_luz),
              precio_total: precio.precio_total
            }
          });
        }
      );
    });
  } catch {
    return res.status(500).json({ ok: false, message: 'Error al reprogramar la reserva' });
  }
};

module.exports = { buscarReservasCliente, cancelarReservaCliente, reprogramarReservaCliente };
