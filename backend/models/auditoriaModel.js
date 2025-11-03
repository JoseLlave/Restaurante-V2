const mongoose = require('mongoose');

const auditoriaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  accion: {
    type: String,
    required: true
  },
  modulo: {
    type: String,
    required: true
  },
  detalles: {
    type: Object,
    default: {}
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

auditoriaSchema.index({ fecha: -1 });
auditoriaSchema.index({ modulo: 1 });
auditoriaSchema.index({ usuario: 1 });

module.exports = mongoose.model('Auditoria', auditoriaSchema);