const express = require('express');
const router = express.Router();
const {
  crearMesa,
  getMesas,
  actualizarMesa,
  actualizarEstadoMesa,
  eliminarMesa
} = require('../controllers/mesaController');

const proteger = require('../middleware/authMiddleware');
const verificarRol = require('../middleware/rolMiddleware');

router.get('/', proteger, verificarRol(['Administrador', 'Mozo']), getMesas);
router.post('/', proteger, verificarRol(['Administrador']), crearMesa);
router.put('/:id', proteger, verificarRol(['Administrador']), actualizarMesa);
router.put('/:id/estado', proteger, verificarRol(['Administrador']), actualizarEstadoMesa);
router.delete('/:id', proteger, verificarRol(['Administrador']), eliminarMesa);

module.exports = router;