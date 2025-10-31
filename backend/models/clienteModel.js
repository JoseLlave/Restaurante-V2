const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  dni: { type: String, required: true, unique: true },
  nombres: { type: String, required: true },
  apellidos: { type: String, required: true },
  telefono: { type: String },
  correo: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Cliente', clienteSchema);
