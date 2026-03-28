const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const canchasController = require('../controllers/canchasController');
const disponibilidadController = require('../controllers/disponibilidadController');
const reservasController = require('../controllers/reservasController');
const clienteReservasController = require('../controllers/clienteReservasController');
const tarifasController = require('../controllers/tarifasController');
const clientesController = require('../controllers/clientesController');

router.get('/configuracion', configuracionController.obtenerConfiguracion);
router.get('/canchas', canchasController.obtenerCanchasActivas);
router.get('/disponibilidad', disponibilidadController.obtenerDisponibilidad);
router.get('/tarifa', tarifasController.calcularTarifaPublica);
router.get('/clientes/:documento', clientesController.obtenerClientePorDocumento);
router.post('/reservas', reservasController.crearReserva);
router.get('/mis-reservas', clienteReservasController.buscarReservasCliente);
router.patch('/mis-reservas/:id/cancelar', clienteReservasController.cancelarReservaCliente);
router.patch('/mis-reservas/:id/reprogramar', clienteReservasController.reprogramarReservaCliente);

module.exports = router;
