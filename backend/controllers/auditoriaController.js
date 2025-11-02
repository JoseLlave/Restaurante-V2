const Auditoria = require('../models/auditoriaModel');
const Usuario = require('../models/usuarioModel');

// 📋 Obtener todos los registros de auditoría con filtros
exports.getAuditoria = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, rol, modulo } = req.query;
    
    // Construir filtros
    let filtro = {};
    
    // Filtro por fecha
    if (fechaDesde || fechaHasta) {
      filtro.fecha = {};
      if (fechaDesde) filtro.fecha.$gte = new Date(fechaDesde);
      if (fechaHasta) filtro.fecha.$lte = new Date(fechaHasta + 'T23:59:59.999Z');
    }
    
    // Filtro por módulo
    if (modulo && modulo !== 'todos') {
      filtro.modulo = modulo;
    }
    
    // Filtro por rol (buscar usuarios con ese rol)
    if (rol && rol !== 'todos') {
      const usuariosConRol = await Usuario.find({ rol }).select('_id');
      const idsUsuarios = usuariosConRol.map(u => u._id);
      filtro.usuario = { $in: idsUsuarios };
    }

    const auditoria = await Auditoria.find(filtro)
      .populate('usuario', 'nombre rol')
      .sort({ fecha: -1 })
      .limit(1000); // Más registros

    res.json(auditoria);
  } catch (error) {
    console.error('Error en getAuditoria:', error);
    res.status(500).json({ mensaje: 'Error al obtener auditoría', error });
  }
};

// 🔍 Obtener módulos únicos para filtros
exports.getModulos = async (req, res) => {
  try {
    const modulos = await Auditoria.distinct('modulo');
    res.json(modulos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener módulos', error });
  }
};

// 🗑️ Eliminar todos los registros de auditoría
exports.eliminarAuditoria = async (req, res) => {
  try {
    const { confirmar } = req.body;
    
    if (!confirmar) {
      return res.status(400).json({ 
        mensaje: 'Debes confirmar la eliminación de todos los registros' 
      });
    }

    if (confirmar !== 'ELIMINAR_TODO') {
      return res.status(400).json({ 
        mensaje: 'Confirmación incorrecta. Escribe: ELIMINAR_TODO' 
      });
    }

    // Eliminar todos los registros de auditoría
    const resultado = await Auditoria.deleteMany({});
    
    res.json({
      mensaje: '✅ Todos los registros de auditoría han sido eliminados',
      registrosEliminados: resultado.deletedCount
    });

  } catch (error) {
    console.error('Error en eliminarAuditoria:', error);
    res.status(500).json({ mensaje: 'Error al eliminar auditoría', error });
  }
};

// 🗑️ Eliminar registros antiguos (por fecha)
exports.eliminarAuditoriaAntigua = async (req, res) => {
  try {
    const { fechaLimite } = req.body;
    
    if (!fechaLimite) {
      return res.status(400).json({ 
        mensaje: 'Debes especificar una fecha límite' 
      });
    }

    const fecha = new Date(fechaLimite);
    
    if (isNaN(fecha.getTime())) {
      return res.status(400).json({ 
        mensaje: 'Fecha límite no válida' 
      });
    }

    // Eliminar registros más antiguos que la fecha límite
    const resultado = await Auditoria.deleteMany({
      fecha: { $lt: fecha }
    });
    
    res.json({
      mensaje: `✅ Registros de auditoría anteriores a ${fechaLimite} eliminados`,
      registrosEliminados: resultado.deletedCount,
      fechaLimite: fechaLimite
    });

  } catch (error) {
    console.error('Error en eliminarAuditoriaAntigua:', error);
    res.status(500).json({ mensaje: 'Error al eliminar auditoría antigua', error });
  }
};