const express = require('express');
const router = express.Router();

// Importar funciones del controlador
const {
  registrarUsuario,
  loginUsuario,
  logoutUsuario,
  me,
  obtenerUsuarios,
  obtenerUsuarioPorId,  // ✅ AGREGAR ESTA LÍNEA
  actualizarUsuario,
  eliminarUsuario,
} = require('../controllers/usuarioController');

// Middlewares
const auth = require('../middleware/authMiddleware');
const rol = require('../middleware/rolMiddleware');

// 🔹 RUTAS PÚBLICAS
router.post('/registrar', registrarUsuario);
router.post('/login', loginUsuario);
router.post('/logout', logoutUsuario);
router.get('/me', auth, me);

// 🔹 RUTAS PROTEGIDAS (solo Administrador)
router.get('/', auth, rol(['Administrador']), obtenerUsuarios);
router.get('/:id', auth, rol(['Administrador']), obtenerUsuarioPorId);  // ✅ NUEVA RUTA
router.put('/:id', auth, rol(['Administrador']), actualizarUsuario);
router.delete('/:id', auth, rol(['Administrador']), eliminarUsuario);

module.exports = router;