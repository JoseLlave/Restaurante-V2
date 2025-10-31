const Usuario = require('../models/usuarioModel');
const jwt = require('jsonwebtoken');

// === Generar token JWT ===
const generarToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// === Registrar usuario ===
exports.registrarUsuario = async (req, res) => {
  try {
    const { nombre, correo, contraseña, contrasena, rol, estado } = req.body;
    const pass = contraseña || contrasena;

    if (!nombre || !correo || !pass) {
      return res.status(400).json({ mensaje: 'Faltan datos' });
    }

    const existe = await Usuario.findOne({ correo });
    if (existe) {
      return res.status(400).json({ mensaje: 'Correo ya registrado' });
    }

    const usuario = await Usuario.create({
      nombre,
      correo,
      contraseña: pass,
      rol: rol || 'Mozo',
      estado: estado || 'activo',
      fechaAlta: new Date(),
    });

    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en registrarUsuario:', error);
    res.status(500).json({ mensaje: 'Error al crear usuario' });
  }
};

// === Login de usuario ===
exports.loginUsuario = async (req, res) => {
  try {
    const { correo, contraseña, contrasena } = req.body;
    const pass = contraseña || contrasena;

    if (!correo || !pass) {
      return res.status(400).json({ mensaje: 'Faltan datos' });
    }

    const usuario = await Usuario.findOne({ correo });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (usuario.estado !== 'activo') {
      return res.status(403).json({ mensaje: 'Usuario inactivo' });
    }

    const ok = await usuario.compararContraseña(pass);
    if (!ok) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    const token = generarToken({ id: usuario._id, rol: usuario.rol });

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Cambiar a true si usas HTTPS en producción
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hora
    });

    res.json({
      mensaje: 'Login correcto',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en loginUsuario:', error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
};

// === Cerrar sesión ===
exports.logoutUsuario = (req, res) => {
  res.clearCookie('token');
  res.json({ mensaje: 'Sesión cerrada correctamente' });
};

// === Obtener datos del usuario logueado ===
exports.me = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId).select('-contraseña');
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.json({ usuario });
  } catch (error) {
    console.error('Error en me:', error);
    res.status(500).json({ mensaje: 'Error al obtener usuario' });
  }
};

// === Listar todos los usuarios (solo admin) ===
exports.obtenerUsuarios = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let filtro = {};

    if (desde && hasta) {
      filtro.fechaAlta = {
        $gte: new Date(desde),
        $lte: new Date(hasta),
      };
    }

    const usuarios = await Usuario.find(filtro)
      .select('-contraseña')
      .sort({ fechaAlta: -1 });

    res.json(usuarios);
  } catch (error) {
    console.error('Error en obtenerUsuarios:', error);
    res.status(500).json({ mensaje: 'Error al obtener usuarios' });
  }
};

// === Actualizar usuario ===
exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rol, estado } = req.body;

    const usuario = await Usuario.findByIdAndUpdate(
      id,
      { nombre, rol, estado },
      { new: true }
    ).select('-contraseña');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario actualizado', usuario });
  } catch (error) {
    console.error('Error en actualizarUsuario:', error);
    res.status(500).json({ mensaje: 'Error al actualizar usuario' });
  }
};

// === Eliminar usuario ===
exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByIdAndDelete(id);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error en eliminarUsuario:', error);
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
};
