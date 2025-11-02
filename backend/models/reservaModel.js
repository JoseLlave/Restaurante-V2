const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  cliente: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cliente', 
    required: true 
  },
  fecha: { 
    type: String, 
    required: true 
  },
  horaInicio: { 
    type: String, 
    required: true 
  },
  horaFin: { 
    type: String, 
    required: true 
  },
  mesa: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Mesa', 
    required: true 
  },
  estado: { 
    type: String, 
    enum: ['Reservada', 'Ocupada', 'Completada', 'Cancelada'], 
    default: 'Reservada' 
  },
  // 🔥 CORREGIR: Eliminar codigoReserva o hacerlo no único
  codigoReserva: {
    type: String,
    // unique: true, // ❌ QUITAR unique
    sparse: true // ✅ Permitir null sin error de duplicado
  }
}, { 
  timestamps: true 
});

// 🔥 OPCIÓN 2: Generar código automáticamente antes de guardar
reservaSchema.pre('save', function(next) {
  if (!this.codigoReserva) {
    // Generar código único: R + timestamp + random
    this.codigoReserva = 'R' + Date.now() + Math.floor(Math.random() * 1000);
  }
  next();
});

module.exports = mongoose.model('Reserva', reservaSchema);