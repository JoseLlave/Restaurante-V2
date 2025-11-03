const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const auth = require('../middleware/authMiddleware');
const rol = require('../middleware/rolMiddleware');

// 🔥 CORREGIR: Esta ruta debe ser pública (sin auth)
router.get('/activos', productoController.getProductosActivos);

// 🔹 RUTAS PROTEGIDAS (Solo Administrador)
router.get('/', auth, rol(['Administrador']), productoController.getProductos);
router.get('/:id', auth, rol(['Administrador']), productoController.getProductoById);
router.post('/', auth, rol(['Administrador']), productoController.crearProducto);
router.put('/:id', auth, rol(['Administrador']), productoController.actualizarProducto);
router.delete('/:id', auth, rol(['Administrador']), productoController.eliminarProducto);

module.exports = router;