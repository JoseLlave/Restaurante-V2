const express = require('express');
const router = express.Router();
const {
  crearMesa,
  getMesas,
  actualizarMesa,
  actualizarEstadoMesa,
  eliminarMesa
} = require('../controllers/mesaController'); // agrega estas funciones

const proteger = require('../middleware/authMiddleware');
const verificarRol = require('../middleware/rolMiddleware');

router.get('/', proteger, verificarRol(['Administrador']), getMesas);
router.post('/', proteger, verificarRol(['Administrador']), crearMesa);
router.put('/:id', proteger, verificarRol(['Administrador']), actualizarMesa);
router.put('/:id/estado', proteger, verificarRol(['Administrador']), actualizarEstadoMesa);
router.delete('/:id', proteger, verificarRol(['Administrador']), eliminarMesa);

module.exports = router;
