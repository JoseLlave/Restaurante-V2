const Auditoria = require('../models/auditoriaModel');

const auditoriaMiddleware = async (req, res, next) => {
  // Guardar la función original de res.json
  const originalJson = res.json;
  
  // Sobrescribir res.json para capturar la respuesta
  res.json = function(data) {
    // Llamar a la función original
    originalJson.call(this, data);
    
    // Registrar en auditoría (de forma asíncrona, no bloquear la respuesta)
    registrarAuditoria(req, res, data).catch(console.error);
  };

  next();
};

async function registrarAuditoria(req, res, respuesta) {
  try {
    // Solo registrar si hay usuario autenticado
    if (!req.usuarioId) return;

    // Determinar el módulo basado en la ruta
    const ruta = req.originalUrl;
    let modulo = 'Sistema';
    
    if (ruta.includes('/api/usuarios')) modulo = 'Usuarios';
    else if (ruta.includes('/api/mesas')) modulo = 'Mesas';
    else if (ruta.includes('/api/reservas')) modulo = 'Reservas';
    else if (ruta.includes('/api/clientes')) modulo = 'Clientes';
    else if (ruta.includes('/api/productos')) modulo = 'Productos';
    else if (ruta.includes('/api/pedidos')) modulo = 'Pedidos';
    else if (ruta.includes('/api/auditoria')) modulo = 'Auditoría';
    else if (ruta.includes('/api/reportes')) modulo = 'Reportes';

    // Determinar la acción basada en el método HTTP y la ruta específica
    let accion = 'Consulta';
    
    if (req.method === 'POST') accion = 'Creación';
    else if (req.method === 'PUT' || req.method === 'PATCH') accion = 'Actualización';
    else if (req.method === 'DELETE') accion = 'Eliminación';
    else if (req.method === 'GET') {
      // Acciones específicas para GET
      if (ruta.includes('/exportar-excel')) accion = 'Exportación Excel';
      else if (ruta.includes('/reportes')) accion = 'Generación Reporte';
      else if (ruta.includes('/auditoria')) accion = 'Consulta Auditoría';
      else accion = 'Consulta';
    }

    // Detalles específicos para diferentes tipos de acciones
    let detalles = {
      ruta: ruta,
      metodo: req.method,
      statusCode: res.statusCode
    };

    // Agregar parámetros de query para reportes
    if (modulo === 'Reportes' && Object.keys(req.query).length > 0) {
      detalles.filtros = req.query;
    }

    // Agregar cuerpo para acciones que modifican datos (excepto contraseñas)
    if (req.method !== 'GET' && req.body) {
      const cuerpoSeguro = { ...req.body };
      
      // Eliminar datos sensibles
      if (cuerpoSeguro.contraseña) delete cuerpoSeguro.contraseña;
      if (cuerpoSeguro.contrasena) delete cuerpoSeguro.contrasena;
      if (cuerpoSeguro.password) delete cuerpoSeguro.password;
      
      detalles.cuerpo = cuerpoSeguro;
    }

    // Agregar información de la respuesta para acciones importantes
    if (respuesta && (modulo === 'Reportes' || req.method !== 'GET')) {
      detalles.respuesta = {
        mensaje: respuesta.mensaje || 'OK',
        cantidadRegistros: respuesta.length || 
                          (respuesta.ventas && respuesta.ventas.length) ||
                          (respuesta.mozos && respuesta.mozos.length) ||
                          (respuesta.mesas && respuesta.mesas.length) ||
                          (respuesta.pedidos && respuesta.pedidos.length) ||
                          null
      };
    }

    // Crear registro de auditoría
    await Auditoria.create({
      usuario: req.usuarioId,
      accion: `${accion} en ${modulo}`,
      modulo: modulo,
      detalles: detalles,
      ip: req.ip || req.connection.remoteAddress || 'Desconocida'
    });

    console.log(`Auditoría registrada: ${req.usuarioId} - ${accion} en ${modulo}`);

  } catch (error) {
    console.error('Error en auditoría middleware:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

module.exports = auditoriaMiddleware;