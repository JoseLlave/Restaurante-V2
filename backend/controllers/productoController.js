const Producto = require('../models/productoModel');

// 📋 Obtener todos los productos
exports.getProductos = async (req, res) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
  } catch (error) {
    console.error('Error en getProductos:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos', error: error.message });
  }
};

// 🔍 Obtener producto por ID - NUEVA FUNCIÓN
exports.getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Buscando producto con ID: ${id}`);

    // Validar formato del ID
    if (!id || id.length !== 24) {
      return res.status(400).json({ mensaje: 'ID de producto no válido' });
    }

    const producto = await Producto.findById(id);

    if (!producto) {
      console.log('❌ Producto no encontrado:', id);
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    console.log('✅ Producto encontrado:', producto.nombre);
    res.json(producto);
    
  } catch (error) {
    console.error('Error en getProductoById:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ mensaje: 'ID de producto no válido' });
    }
    
    res.status(500).json({ mensaje: 'Error al obtener producto', error: error.message });
  }
};

// ➕ Crear nuevo producto
exports.crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, tiempoAprox, stock, categoria, estado } = req.body;
    
    // Validaciones básicas
    if (!nombre || !precio || !categoria) {
      return res.status(400).json({ mensaje: 'Nombre, precio y categoría son obligatorios' });
    }

    const nuevoProducto = new Producto({
      nombre,
      descripcion: descripcion || '',
      precio: parseFloat(precio),
      tiempoAprox: parseInt(tiempoAprox) || 15,
      stock: parseInt(stock) || 0,
      categoria,
      estado: estado || 'activo'
    });

    await nuevoProducto.save();
    
    console.log('✅ Producto creado:', nuevoProducto._id);
    res.status(201).json(nuevoProducto);
    
  } catch (error) {
    console.error('Error en crearProducto:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ mensaje: 'Error de validación', detalles: error.message });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ mensaje: 'Ya existe un producto con ese nombre' });
    }
    
    res.status(500).json({ mensaje: 'Error al crear producto', error: error.message });
  }
};

// ✏️ Actualizar producto
exports.actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, tiempoAprox, stock, categoria, estado } = req.body;

    console.log(`🔄 Actualizando producto ${id} con datos:`, req.body);

    // Validar que el producto existe
    const productoExistente = await Producto.findById(id);
    if (!productoExistente) {
      console.log('❌ Producto no encontrado:', id);
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    // Preparar datos para actualizar
    const datosActualizar = {};
    
    if (nombre !== undefined) datosActualizar.nombre = nombre;
    if (descripcion !== undefined) datosActualizar.descripcion = descripcion;
    if (precio !== undefined) datosActualizar.precio = parseFloat(precio);
    if (tiempoAprox !== undefined) datosActualizar.tiempoAprox = parseInt(tiempoAprox);
    if (stock !== undefined) datosActualizar.stock = parseInt(stock);
    if (categoria !== undefined) datosActualizar.categoria = categoria;
    if (estado !== undefined) datosActualizar.estado = estado;

    // Actualizar producto
    const producto = await Producto.findByIdAndUpdate(
      id, 
      datosActualizar, 
      { 
        new: true, // Devuelve el documento actualizado
        runValidators: true // Ejecuta las validaciones del schema
      }
    );

    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado después de actualizar' });
    }

    console.log('✅ Producto actualizado:', producto._id);
    res.json(producto);
    
  } catch (error) {
    console.error('Error en actualizarProducto:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ mensaje: 'Error de validación', detalles: error.message });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ mensaje: 'Ya existe un producto con ese nombre' });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ mensaje: 'ID de producto no válido' });
    }
    
    res.status(500).json({ mensaje: 'Error al actualizar producto', error: error.message });
  }
};

// 🗑️ Eliminar producto
exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Eliminando producto: ${id}`);

    const producto = await Producto.findByIdAndDelete(id);
    
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    console.log('✅ Producto eliminado:', id);
    res.json({ mensaje: 'Producto eliminado correctamente' });

  } catch (error) {
    console.error('Error en eliminarProducto:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ mensaje: 'ID de producto no válido' });
    }
    
    res.status(500).json({ mensaje: 'Error al eliminar producto', error: error.message });
  }
};

// 🔍 Obtener productos activos (para carta)
exports.getProductosActivos = async (req, res) => {
  try {
    const productos = await Producto.find({ 
      estado: 'activo',
      stock: { $gt: 0 }
    }).sort({ categoria: 1, nombre: 1 });
    
    res.json(productos);
  } catch (error) {
    console.error('Error en getProductosActivos:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos activos', error: error.message });
  }
};