const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
  contraseña: { type: String, required: true, minlength: 6 },
  rol: { 
    type: String, 
    enum: ['Administrador', 'Mozo', 'Cocinero', 'Cajero'], 
    default: 'Mozo' 
  },
  estado: { 
    type: String, 
    enum: ['activo', 'inactivo'], 
    default: 'activo' 
  },
  fechaAlta: { type: Date, default: Date.now }
});

// 🔒 Encriptar contraseña solo si fue modificada o es nueva
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('contraseña')) return next();

  // Evitar doble hash (solo si la contraseña ya es un hash válido)
  const isAlreadyHashed = /^\$2[aby]\$.{56}$/.test(this.contraseña);
  if (isAlreadyHashed) return next();

  const salt = await bcrypt.genSalt(10);
  this.contraseña = await bcrypt.hash(this.contraseña, salt);
  next();
});

// 🧠 Método para comparar contraseñas
usuarioSchema.methods.compararContraseña = async function (pass) {
  return await bcrypt.compare(pass, this.contraseña);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
