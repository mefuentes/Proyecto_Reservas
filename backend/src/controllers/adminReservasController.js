const db = require('../config/db');
const { esFechaValida, esHoraValida, esDuracionValida } = require('../utils/validators');
const { sumarMinutosAHora, esFechaHoraPosteriorActual } = require('../utils/datetime');
const { calcularDisponibilidad } = require('../services/disponibilidadService');
const { calcularPrecio } = require('../services/tarifasService');
const { crearOActualizarCliente, normalizarDocumento, normalizarNombreApellido, normalizarTelefono } = require('../services/clientesService');

const baseSelect = `SELECT r.id, r.cancha_id, r.documento_cliente, r.cliente_id, c.nombre AS cancha_nombre, r.fecha, r.hora_inicio, r.hora_fin, r.duracion_minutos, r.nombre_cliente, r.telefono_cliente, r.estado, r.origen, r.observaciones, r.created_at, r.con_luz, r.precio_total, r.cancelado_por_tipo, r.cancelado_por_nombre FROM reservas r INNER JOIN canchas c ON c.id = r.cancha_id`;

function obtenerNombreAdmin(adminId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT nombre FROM usuarios_admin WHERE id = ?`, [adminId], (err, row) => {
      if (err) return reject(err);
      resolve(row?.nombre || 'Usuario del panel');
    });
  });
}

const obtenerAgenda = (req, res) => {
  const { fecha, cancha_id, estado } = req.query;
  if (!fecha || !esFechaValida(fecha)) return res.status(400).json({ ok: false, message: 'Debe enviar una fecha valida' });

  let sql = `${baseSelect} WHERE r.fecha = ?`;
  const params = [fecha];

  if (cancha_id) {
    sql += ' AND r.cancha_id = ?';
    params.push(cancha_id);
  }
  if (estado) {
    sql += ' AND r.estado = ?';
    params.push(estado);
  }

  sql += ` ORDER BY
    r.hora_inicio ASC,
    CAST(REPLACE(LOWER(c.nombre), 'cancha ', '') AS INTEGER) ASC,
    c.nombre ASC`;

  db.all(sql, params, (err, rows) => (
    err
      ? res.status(500).json({ ok: false, message: 'Error al obtener agenda' })
      : res.json({ ok: true, data: rows })
  ));
};

const listarReservas = (req, res) => obtenerAgenda(req, res);

const cancelarReserva = async (req, res) => {
  const { id } = req.params;
  db.get(`SELECT fecha, hora_inicio, estado FROM reservas WHERE id = ?`, [id], async (findErr, reserva) => {
    if (findErr) return res.status(500).json({ ok: false, message: 'Error al buscar la reserva' });
    if (!reserva) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    if (!esFechaHoraPosteriorActual(reserva.fecha, reserva.hora_inicio)) {
      return res.status(400).json({ ok: false, message: 'Solo se puede cancelar una reserva antes de su horario de inicio.' });
    }

    let nombreAdmin = 'Usuario del panel';
    try {
      nombreAdmin = await obtenerNombreAdmin(req.admin?.id);
    } catch {}

    db.run(`UPDATE reservas SET estado = 'cancelada', cancelado_por_tipo = 'admin', cancelado_por_nombre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [nombreAdmin, id], function (err) {
      if (err) return res.status(500).json({ ok: false, message: 'Error al cancelar reserva' });
      if (this.changes === 0) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
      return res.json({ ok: true, message: 'Reserva cancelada correctamente' });
    });
  });
};

const reprogramarReservaAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nueva_fecha, nueva_cancha_id, nueva_hora_inicio, nueva_duracion_minutos, con_luz } = req.body || {};

    if (!nueva_fecha || !nueva_cancha_id || !nueva_hora_inicio || !nueva_duracion_minutos) {
      return res.status(400).json({ ok: false, message: 'Faltan datos obligatorios para reprogramar' });
    }
    if (!esFechaValida(nueva_fecha) || !esHoraValida(nueva_hora_inicio) || !esDuracionValida(nueva_duracion_minutos)) {
      return res.status(400).json({ ok: false, message: 'Datos invalidos para la reprogramacion' });
    }
    if (!esFechaHoraPosteriorActual(nueva_fecha, nueva_hora_inicio)) {
      return res.status(400).json({ ok: false, message: 'No es posible reprogramar a una fecha u horario anterior al actual.' });
    }

    db.get(`${baseSelect} WHERE r.id = ?`, [id], async (findErr, reserva) => {
      if (findErr) return res.status(500).json({ ok: false, message: 'Error al buscar la reserva' });
      if (!reserva) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
      if (reserva.estado !== 'confirmada') return res.status(400).json({ ok: false, message: 'Solo se pueden reprogramar reservas confirmadas' });
      // Nota: A diferencia del cliente, el admin puede reprogramar cualquier reserva futura sin restricciones de tiempo mínimo
      if (!esFechaHoraPosteriorActual(reserva.fecha, reserva.hora_inicio)) {
        return res.status(400).json({ ok: false, message: 'Solo se puede reprogramar una reserva antes de su horario de inicio.' });
      }

      const horariosDisponibles = await calcularDisponibilidad(Number(nueva_cancha_id), nueva_fecha, Number(nueva_duracion_minutos), { excludeReservaId: Number(id) });
      const horarioValido = horariosDisponibles.find((h) => h.hora_inicio === nueva_hora_inicio);
      if (!horarioValido) return res.status(409).json({ ok: false, message: 'El nuevo horario seleccionado no esta disponible' });

      const precio = await calcularPrecio(Number(nueva_cancha_id), Number(nueva_duracion_minutos), Boolean(con_luz));
      const nuevaHoraFin = sumarMinutosAHora(nueva_hora_inicio, Number(nueva_duracion_minutos));

      db.run(`UPDATE reservas SET estado = 'reprogramada', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], (updateErr) => {
        if (updateErr) return res.status(500).json({ ok: false, message: 'Error al marcar la reserva original' });

        db.run(
          `INSERT INTO reservas (cancha_id, cliente_id, documento_cliente, fecha, hora_inicio, hora_fin, duracion_minutos, nombre_cliente, telefono_cliente, estado, origen, observaciones, con_luz, precio_base_aplicado, adicional_luz_aplicado, precio_total, reserva_original_id, motivo_cambio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', 'admin', ?, ?, ?, ?, ?, ?, 'Reprogramacion de admin')`,
          [
            Number(nueva_cancha_id),
            reserva.cliente_id,
            reserva.documento_cliente,
            nueva_fecha,
            nueva_hora_inicio,
            nuevaHoraFin,
            Number(nueva_duracion_minutos),
            reserva.nombre_cliente,
            reserva.telefono_cliente,
            reserva.observaciones || null,
            Boolean(con_luz) ? 1 : 0,
            precio.precio_base,
            precio.adicional_luz,
            precio.precio_total,
            reserva.id
          ],
          function (insertErr) {
            if (insertErr) return res.status(500).json({ ok: false, message: 'Error al crear la nueva reserva' });
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
    });
  } catch {
    return res.status(500).json({ ok: false, message: 'Error al reprogramar la reserva' });
  }
};

const crearReservaManual = async (req, res) => {
  try {
    const { cancha_id, fecha, hora_inicio, duracion_minutos, documento_cliente, nombre_cliente, telefono_cliente, observaciones, con_luz } = req.body;
    if (!cancha_id || !fecha || !hora_inicio || !duracion_minutos || !documento_cliente || !nombre_cliente) {
      return res.status(400).json({ ok: false, message: 'Faltan datos obligatorios' });
    }
    if (!esFechaValida(fecha) || !esHoraValida(hora_inicio)) return res.status(400).json({ ok: false, message: 'Fecha u hora invalida' });
    if (!esDuracionValida(duracion_minutos)) return res.status(400).json({ ok: false, message: 'Duracion invalida' });

    const documento = normalizarDocumento(documento_cliente);
    const nombre = normalizarNombreApellido(nombre_cliente);
    const telefono = normalizarTelefono(telefono_cliente);

    db.get(`SELECT id, activa FROM canchas WHERE id = ?`, [cancha_id], async (err, cancha) => {
      if (err) return res.status(500).json({ ok: false, message: 'Error al validar cancha' });
      if (!cancha || !cancha.activa) return res.status(400).json({ ok: false, message: 'La cancha seleccionada no esta activa' });

      const cliente = await crearOActualizarCliente({ documento, nombre_apellido: nombre, telefono });
      const horariosDisponibles = await calcularDisponibilidad(Number(cancha_id), fecha, Number(duracion_minutos));
      const horarioValido = horariosDisponibles.find((h) => h.hora_inicio === hora_inicio);
      if (!horarioValido) return res.status(409).json({ ok: false, message: 'Ese horario no esta disponible' });

      const hora_fin = sumarMinutosAHora(hora_inicio, Number(duracion_minutos));
      const precio = await calcularPrecio(Number(cancha_id), Number(duracion_minutos), Boolean(con_luz));

      db.run(
        `INSERT INTO reservas (cancha_id, cliente_id, documento_cliente, fecha, hora_inicio, hora_fin, duracion_minutos, nombre_cliente, telefono_cliente, estado, origen, observaciones, con_luz, precio_base_aplicado, adicional_luz_aplicado, precio_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', 'admin', ?, ?, ?, ?, ?)`,
        [cancha_id, cliente.id, documento, fecha, hora_inicio, hora_fin, duracion_minutos, nombre, telefono, observaciones || null, Boolean(con_luz) ? 1 : 0, precio.precio_base, precio.adicional_luz, precio.precio_total],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ ok: false, message: 'Error al crear la reserva manual' });
          return res.status(201).json({ ok: true, data: { id: this.lastID, precio_total: precio.precio_total } });
        }
      );
    });
  } catch {
    return res.status(500).json({ ok: false, message: 'Error interno al crear la reserva manual' });
  }
};

module.exports = { obtenerAgenda, listarReservas, cancelarReserva, crearReservaManual, reprogramarReservaAdmin };