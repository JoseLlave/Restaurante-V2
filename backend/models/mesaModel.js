const mongoose = require('mongoose');

const mesaSchema = new mongoose.Schema({
  numero: { type: Number, required: true, unique: true },
  capacidad: { type: Number, required: true },

  estado: {
    type: String,
    enum: ['Libre', 'Ocupada', 'Reservada', 'Pendiente de pago', 'Cerrada'],
    default: 'Libre'
  },

  ubicacion: { type: String, trim: true },

  // === NUEVOS CAMPOS para el mapa interactivo ===
  piso: {
    type: Number,
    default: 1, // Piso 1 por defecto
  },
  posX: {
    type: Number,
    default: 0, // Coordenada horizontal en porcentaje (0–100)
  },
  posY: {
    type: Number,
    default: 0, // Coordenada vertical en porcentaje (0–100)
  }

}, { timestamps: true }); // Crea createdAt y updatedAt automáticamente

module.exports = mongoose.model('Mesa', mesaSchema);
