// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
    if(!token) return res.status(401).json({ mensaje: 'No autorizado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = decoded.id;
    req.usuarioRol = decoded.rol;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
};
