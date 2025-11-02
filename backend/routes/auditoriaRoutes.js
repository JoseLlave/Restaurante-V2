const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const auth = require('../middleware/authMiddleware');
const rol = require('../middleware/rolMiddleware');

// 🔹 RUTAS PROTEGIDAS (Solo Administrador)
router.get('/', auth, rol(['Administrador']), auditoriaController.getAuditoria);
router.get('/modulos', auth, rol(['Administrador']), auditoriaController.getModulos);

// 🗑️ NUEVAS RUTAS PARA ELIMINAR (Solo Administrador)
router.delete('/', auth, rol(['Administrador']), auditoriaController.eliminarAuditoria);
router.delete('/antigua', auth, rol(['Administrador']), auditoriaController.eliminarAuditoriaAntigua);

module.exports = router;