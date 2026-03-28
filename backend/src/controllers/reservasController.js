const db = require('../config/db');
const { esFechaValida, esHoraValida, esDuracionValida } = require('../utils/validators');
const { sumarMinutosAHora } = require('../utils/datetime');
const { calcularDisponibilidad } = require('../services/disponibilidadService');
const { calcularPrecio } = require('../services/tarifasService');
const whatsappService = require('../services/whatsappService');
const { crearOActualizarCliente, normalizarDocumento, normalizarNombreApellido, normalizarTelefono } = require('../services/clientesService');

function cumpleAnticipacionOperativa(fecha, horaInicio, anticipacion, horaApertura, horaCierre) {
  const inicio = new Date(`${fecha}T${horaInicio}:00`);
  if (horaApertura && horaCierre && horaCierre <= horaApertura && horaInicio < horaApertura) {
    inicio.setDate(inicio.getDate() + 1);
  }
  const diffMin = (inicio.getTime() - Date.now()) / (1000 * 60);
  return diffMin >= Number(anticipacion || 0);
}

const crearReserva = async (req, res) => {
  try {
    const { cancha_id, fecha, hora_inicio, duracion_minutos, documento_cliente, nombre_cliente, telefono_cliente, con_luz } = req.body;
    if (!cancha_id || !fecha || !hora_inicio || !duracion_minutos || !documento_cliente || !nombre_cliente) {
      return res.status(400).json({ ok: false, message: 'Faltan datos obligatorios' });
    }
    if (!esFechaValida(fecha) || !esHoraValida(hora_inicio)) {
      return res.status(400).json({ ok: false, message: 'Fecha u hora inválida' });
    }
    if (!esDuracionValida(duracion_minutos)) {
      return res.status(400).json({ ok: false, message: 'Duración inválida' });
    }

    const documento = normalizarDocumento(documento_cliente);
    const nombre = normalizarNombreApellido(nombre_cliente);
    const telefono = normalizarTelefono(telefono_cliente);
    if (!documento) return res.status(400).json({ ok: false, message: 'El número de documento es obligatorio' });
    if (!nombre) return res.status(400).json({ ok: false, message: 'El nombre y apellido es obligatorio' });

    db.get(`SELECT id, activa, nombre, hora_apertura, hora_cierre FROM canchas WHERE id = ?`, [cancha_id], async (err, cancha) => {
      if (err) return res.status(500).json({ ok: false, message: 'Error al validar cancha' });
      if (!cancha || !cancha.activa) return res.status(400).json({ ok: false, message: 'La cancha seleccionada no está disponible' });

      db.get(`SELECT anticipacion_minima FROM configuracion ORDER BY id DESC LIMIT 1`, [], async (configErr, config) => {
        if (configErr) return res.status(500).json({ ok: false, message: 'Error al obtener la configuración' });
        const anticipacionMinima = Number(config?.anticipacion_minima || 0);
        if (anticipacionMinima > 0 && !cumpleAnticipacionOperativa(fecha, hora_inicio, anticipacionMinima, cancha.hora_apertura, cancha.hora_cierre)) {
          return res.status(400).json({ ok: false, message: `No es posible reservar ese turno porque el club exige una anticipación mínima de ${anticipacionMinima} minutos.` });
        }

        try {
          const cliente = await crearOActualizarCliente({ documento, nombre_apellido: nombre, telefono });
          const horariosDisponibles = await calcularDisponibilidad(Number(cancha_id), fecha, Number(duracion_minutos));
          const horarioValido = horariosDisponibles.find((h) => h.hora_inicio === hora_inicio);
          if (!horarioValido) return res.status(409).json({ ok: false, message: 'Ese horario ya no está disponible' });

          const hora_fin = sumarMinutosAHora(hora_inicio, Number(duracion_minutos));
          const precio = await calcularPrecio(Number(cancha_id), Number(duracion_minutos), Boolean(con_luz));

          db.run(
            `INSERT INTO reservas (cancha_id, cliente_id, documento_cliente, fecha, hora_inicio, hora_fin, duracion_minutos, nombre_cliente, telefono_cliente, estado, origen, con_luz, precio_base_aplicado, adicional_luz_aplicado, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', 'web', ?, ?, ?, ?)`,
            [cancha_id, cliente.id, documento, fecha, hora_inicio, hora_fin, duracion_minutos, nombre, telefono, Boolean(con_luz) ? 1 : 0, precio.precio_base, precio.adicional_luz, precio.precio_total],
            async function (insertErr) {
              if (insertErr) return res.status(500).json({ ok: false, message: 'Error al crear la reserva' });
              try {
                let telefonoWhatsapp = String(telefono || '').trim();
                if (!telefonoWhatsapp.startsWith('whatsapp:') && telefonoWhatsapp.startsWith('+')) telefonoWhatsapp = `whatsapp:${telefonoWhatsapp}`;
                if (telefonoWhatsapp.startsWith('whatsapp:+')) {
                  await whatsappService.enviarConfirmacionReserva({ telefono: telefonoWhatsapp, cancha: cancha.nombre, fecha, hora_inicio, hora_fin, duracion_minutos, con_luz: Boolean(con_luz), precio_total: precio.precio_total });
                }
              } catch (waError) {
                console.error('No se pudo enviar confirmación por WhatsApp:', waError.message);
              }
              return res.status(201).json({ ok: true, message: 'Reserva creada correctamente', data: { id: this.lastID, cancha_id, cliente_id: cliente.id, documento_cliente: documento, fecha, hora_inicio, hora_fin, duracion_minutos, nombre_cliente: nombre, telefono_cliente: telefono, estado: 'confirmada', con_luz: Boolean(con_luz), precio_total: precio.precio_total } });
            }
          );
        } catch (error) {
          return res.status(500).json({ ok: false, message: 'Error interno al crear la reserva' });
        }
      });
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error interno al crear la reserva' });
  }
};

module.exports = { crearReserva };
