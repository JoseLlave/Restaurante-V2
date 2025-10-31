// backend/middleware/rolMiddleware.js
module.exports = (roles = []) => {
  if(typeof roles === 'string') roles = [roles];
  return (req, res, next) => {
    if(!roles.includes(req.usuarioRol)) return res.status(403).json({ mensaje: 'Acceso denegado' });
    next();
  };
};
