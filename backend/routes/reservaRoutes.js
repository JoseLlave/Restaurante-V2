// backend/routes/reservaRoutes.js
const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');

// CRUD
router.post('/', reservaController.crearReserva);
router.get('/', reservaController.listarReservas);
router.put('/:id', reservaController.actualizarReserva);
router.delete('/:id', reservaController.eliminarReserva);

module.exports = router;
