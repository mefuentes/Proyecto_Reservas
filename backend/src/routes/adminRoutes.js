const express = require('express');
const router = express.Router();
const authAdmin = require('../middlewares/authAdmin');
const requireAdminRoles = require('../middlewares/requireAdminRoles');
const adminAuthController = require('../controllers/adminAuthController');
const adminCanchasController = require('../controllers/adminCanchasController');
const adminReservasController = require('../controllers/adminReservasController');
const bloqueosController = require('../controllers/bloqueosController');
const adminConfiguracionController = require('../controllers/adminConfiguracionController');
const tarifasController = require('../controllers/tarifasController');
const reportesController = require('../controllers/reportesController');
const clientesController = require('../controllers/clientesController');
const adminUsuariosController = require('../controllers/adminUsuariosController');

router.post('/login', adminAuthController.login);

router.get('/canchas', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial', 'empleado'), adminCanchasController.listarCanchas);
router.post('/canchas', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminCanchasController.crearCancha);
router.put('/canchas/:id', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminCanchasController.editarCancha);
router.patch('/canchas/:id/estado', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminCanchasController.cambiarEstadoCancha);

router.get('/agenda', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial', 'empleado'), adminReservasController.obtenerAgenda);
router.get('/reservas', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminReservasController.listarReservas);
router.post('/reservas', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial', 'empleado'), adminReservasController.crearReservaManual);
router.patch('/reservas/:id/cancelar', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial', 'empleado'), adminReservasController.cancelarReserva);
router.patch('/reservas/:id/reprogramar', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial', 'empleado'), adminReservasController.reprogramarReservaAdmin);

router.get('/bloqueos', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), bloqueosController.listarBloqueosPorFecha);
router.post('/bloqueos', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), bloqueosController.crearBloqueo);
router.post('/bloqueos-test', bloqueosController.crearBloqueo);
router.put('/bloqueos/:id', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), bloqueosController.actualizarBloqueo);
router.delete('/bloqueos/:id', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), bloqueosController.eliminarBloqueo);

router.get('/configuracion', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminConfiguracionController.obtenerConfiguracionAdmin);
router.put('/configuracion', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminConfiguracionController.actualizarConfiguracion);

router.get('/tarifas', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), tarifasController.listarTarifas);
router.post('/tarifas', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), tarifasController.crearTarifa);
router.put('/tarifas/:id', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), tarifasController.actualizarTarifa);
router.delete('/tarifas/:id', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), tarifasController.eliminarTarifa);

router.get('/clientes', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), clientesController.listarClientesAdmin);
router.post('/clientes', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), clientesController.crearClienteAdmin);
router.put('/clientes/:id', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), clientesController.actualizarClienteAdmin);
router.delete('/clientes/:id', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), clientesController.eliminarClienteAdmin);

router.get('/reportes/resumen', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), reportesController.resumen);
router.get('/reportes/exportar-excel', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), reportesController.exportarExcel);
router.get('/reportes/exportar-pdf', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), reportesController.exportarPdf);

router.get('/usuarios', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminUsuariosController.listarUsuariosAdmin);
router.post('/usuarios', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminUsuariosController.crearUsuarioAdmin);
router.put('/usuarios/:id', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminUsuariosController.actualizarUsuarioAdmin);
router.patch('/usuarios/:id/estado', authAdmin, requireAdminRoles('admin', 'gerente', 'gerencial'), adminUsuariosController.cambiarEstadoUsuarioAdmin);

module.exports = router;
