const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const auth = require('../middleware/authMiddleware');
const rol = require('../middleware/rolMiddleware');

// 🔹 RUTAS PROTEGIDAS
router.post('/', auth, rol(['Administrador', 'Mozo']), reservaController.crearReserva);
router.get('/', auth, reservaController.listarReservas);
router.put('/:id', auth, rol(['Administrador', 'Mozo']), reservaController.actualizarReserva);
router.delete('/:id', auth, rol(['Administrador']), reservaController.eliminarReserva);

module.exports = router;