const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const auth = require('../middleware/authMiddleware');
const rol = require('../middleware/rolMiddleware');

router.get('/ventas', auth, rol(['Administrador']), reporteController.reporteVentas);
router.get('/mozos', auth, rol(['Administrador']), reporteController.reporteMozos);
router.get('/mesas', auth, rol(['Administrador']), reporteController.reporteMesas);
router.get('/exportar-excel', auth, rol(['Administrador']), reporteController.exportarExcel);

module.exports = router;