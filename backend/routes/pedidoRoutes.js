const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const auth = require('../middleware/authMiddleware');
const rol = require('../middleware/rolMiddleware');

// ================================
// 🔹 RUTAS PARA MOZOS
// ================================
router.post('/', auth, rol(['Mozo']), pedidoController.crearPedido);
router.get('/mesa/:mesaId', auth, rol(['Mozo']), pedidoController.getPedidosPorMesa);

// ================================
// 🔹 RUTAS PARA VER PEDIDOS (MOZO + COCINERO + ADMIN)
// ================================
router.get('/', auth, rol(['Mozo', 'Cocinero', 'Administrador']), pedidoController.getPedidos);
router.get('/:id', auth, rol(['Mozo', 'Cocinero', 'Administrador']), pedidoController.getPedidoById);

// ================================
// 🔹 RUTA PARA CAMBIAR ESTADO (MOZO + COCINERO + ADMIN) - 🔥 CORREGIDO
// ================================
router.put('/:id/estado', auth, rol(['Mozo', 'Cocinero', 'Administrador']), pedidoController.actualizarEstado);

// ================================
// 🔹 RUTAS ADMIN (SOLO ELIMINAR)
// ================================
router.delete('/:id', auth, rol(['Administrador']), pedidoController.eliminarPedido);

module.exports = router;