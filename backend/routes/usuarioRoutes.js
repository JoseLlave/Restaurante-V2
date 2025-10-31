const express = require('express');
const router = express.Router();

// Importar funciones del controlador
const {
  registrarUsuario,
  loginUsuario,
  logoutUsuario,
  me,
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario,
} = require('../controllers/usuarioController');

// Middlewares
const auth = require('../middleware/authMiddleware');
const rol = require('../middleware/rolMiddleware');

/**
 * 🔹 RUTAS PÚBLICAS
 */

// Registrar usuario (solo libre para pruebas)
router.post('/registrar', registrarUsuario);

// Login y logout
router.post('/login', loginUsuario);
router.post('/logout', logoutUsuario);

// Información del usuario autenticado
router.get('/me', auth, me);

/**
 * 🔹 RUTAS PROTEGIDAS (solo Administrador)
 */

// Obtener todos los usuarios
router.get('/', auth, rol(['Administrador']), obtenerUsuarios);

// Actualizar usuario
router.put('/:id', auth, rol(['Administrador']), actualizarUsuario);

// Eliminar usuario
router.delete('/:id', auth, rol(['Administrador']), eliminarUsuario);

module.exports = router;
