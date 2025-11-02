const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: true, 
    trim: true 
  },
  descripcion: { 
    type: String, 
    default: '' 
  },
  precio: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  tiempoAprox: { 
    type: Number, 
    required: true, 
    min: 1 
  }, // en minutos
  stock: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  categoria: { 
    type: String, 
    required: true,
    enum: ['Entrada', 'Plato Principal', 'Postre', 'Bebida', 'Acompañamiento', 'Especialidad']
  },
  estado: { 
    type: String, 
    enum: ['activo', 'inactivo'], 
    default: 'activo' 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Producto', productoSchema);