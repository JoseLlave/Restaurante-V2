const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  fecha: { type: String, required: true },
  horaInicio: { type: String, required: true },
  horaFin: { type: String, required: true },
  mesa: { type: mongoose.Schema.Types.ObjectId, ref: 'Mesa', required: true },
  estado: { type: String, enum: ['Reservada', 'Ocupada', 'Completada', 'Cancelada'], default: 'Reservada' },
});

module.exports = mongoose.model('Reserva', reservaSchema);
