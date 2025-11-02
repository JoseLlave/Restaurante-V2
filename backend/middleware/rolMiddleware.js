// backend/middleware/rolMiddleware.js
module.exports = (roles = []) => {
  if(typeof roles === 'string') roles = [roles];
  return (req, res, next) => {
    if(!roles.includes(req.usuarioRol)) {
      console.log(`❌ Acceso denegado: ${req.usuarioRol} intentó acceder a ruta que requiere: ${roles.join(', ')}`);
      return res.status(403).json({ mensaje: 'Acceso denegado' });
    }
    next();
  };
};