const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema({
  mesa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mesa',
    required: true
  },
  mozo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  items: [{
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    },
    precioUnitario: {
      type: Number,
      required: true,
      min: 0
    },
    observaciones: {
      type: String,
      default: ''
    }
  }],
  estado: {
    type: String,
    enum: ['creado', 'en_cocina', 'listo', 'entregado', 'pagado', 'cancelado'],
    default: 'creado'
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  observacionesGenerales: {
    type: String,
    default: ''
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  // 🔥 CORREGIDO: Si necesitas un código único, genera uno automáticamente
  codigo: {
    type: String,
    unique: true,
    sparse: true // 🔥 IMPORTANTE: Permite valores null sin error de duplicado
  }
}, {
  timestamps: true
});

// 🔥 OPCIÓN 2: Eliminar el índice único si no necesitas código
// Ejecuta en MongoDB: db.pedidos.dropIndex("codigo_1")

// 🔥 OPCIÓN 3: Generar código automáticamente antes de guardar
pedidoSchema.pre('save', function(next) {
  if (!this.codigo) {
    // Generar código único: P + timestamp + random
    this.codigo = 'P' + Date.now() + Math.floor(Math.random() * 1000);
  }
  next();
});

// Actualizar fechaActualizacion antes de guardar
pedidoSchema.pre('save', function(next) {
  this.fechaActualizacion = Date.now();
  next();
});

module.exports = mongoose.model('Pedido', pedidoSchema);