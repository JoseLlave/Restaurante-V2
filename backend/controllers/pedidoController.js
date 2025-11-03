const Pedido = require('../models/pedidoModel');
const Producto = require('../models/productoModel');
const Mesa = require('../models/mesaModel');

// Obtener todos los pedidos
exports.getPedidos = async (req, res) => {
  try {
    const { estado } = req.query;
    let filtro = {};

    // Filtrar por estado si se especifica
    if (estado && estado !== 'todos') {
      filtro.estado = estado;
    }

    const pedidos = await Pedido.find(filtro)
      .populate('mesa', 'numero capacidad piso')
      .populate('mozo', 'nombre')
      .populate('items.producto', 'nombre precio categoria')
      .sort({ fechaCreacion: -1 });

    res.json(pedidos);
  } catch (error) {
    console.error('Error en getPedidos:', error);
    res.status(500).json({ mensaje: 'Error al obtener pedidos', error });
  }
};

// Crear nuevo pedido
exports.crearPedido = async (req, res) => {
  try {
    const { mesaId, items, observacionesGenerales } = req.body;
    const mozoId = req.usuarioId; // El mozo que crea el pedido

    const mesa = await Mesa.findById(mesaId);
    if (!mesa) {
      return res.status(404).json({ mensaje: 'Mesa no encontrada' });
    }

    // 🔥 CORREGIDO: Permitir solo mesas Reservadas u Ocupadas para pedidos
    if (!['Reservada', 'Ocupada'].includes(mesa.estado)) {
      return res.status(400).json({ 
        mensaje: `La mesa no está disponible para pedidos. Estado actual: ${mesa.estado}` 
      });
    }

    // Validar que la mesa no esté ocupada con otro pedido activo
    const pedidoActivo = await Pedido.findOne({ 
      mesa: mesaId, 
      estado: { $in: ['creado', 'en_cocina', 'listo'] } 
    });

    if (pedidoActivo) {
      return res.status(400).json({ mensaje: 'La mesa ya tiene un pedido activo' });
    }

    // Validar y calcular items
    let total = 0;
    const itemsConPrecio = [];

    for (const item of items) {
      const producto = await Producto.findById(item.productoId);
      if (!producto) {
        return res.status(404).json({ mensaje: `Producto ${item.productoId} no encontrado` });
      }

      if (producto.stock < item.cantidad) {
        return res.status(400).json({ mensaje: `Stock insuficiente para ${producto.nombre}` });
      }

      if (producto.estado !== 'activo') {
        return res.status(400).json({ mensaje: `Producto ${producto.nombre} no está activo` });
      }

      const subtotal = producto.precio * item.cantidad;
      total += subtotal;

      itemsConPrecio.push({
        producto: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: producto.precio,
        observaciones: item.observaciones || ''
      });

      // Actualizar stock del producto
      producto.stock -= item.cantidad;
      await producto.save();
    }

    // Crear el pedido
    const nuevoPedido = new Pedido({
      mesa: mesaId,
      mozo: mozoId,
      items: itemsConPrecio,
      total: total,
      observacionesGenerales: observacionesGenerales || '',
      estado: 'creado'
    });

    await nuevoPedido.save();

    // Cambiar estado de la mesa a "Ocupada"
    mesa.estado = 'Ocupada';
    await mesa.save();

    // Populate para devolver datos completos
    const pedidoCreado = await Pedido.findById(nuevoPedido._id)
      .populate('mesa', 'numero capacidad piso')
      .populate('mozo', 'nombre')
      .populate('items.producto', 'nombre precio categoria');

    res.status(201).json(pedidoCreado);

  } catch (error) {
    console.error('Error en crearPedido:', error);
    res.status(500).json({ mensaje: 'Error al crear pedido', error });
  }
};

// ✏️ Actualizar estado del pedido
exports.actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const usuarioRol = req.usuarioRol;

    console.log(`Usuario ${usuarioRol} intenta cambiar pedido ${id} a estado: ${estado}`);

    const estadosValidos = ['creado', 'en_cocina', 'listo', 'entregado', 'pagado', 'cancelado'];
    
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ mensaje: 'Estado no válido' });
    }

    // 🔥 CORREGIDO: Permisos actualizados
    if (usuarioRol === 'Cocinero') {
      const estadosPermitidosCocinero = ['en_cocina', 'listo'];
      if (!estadosPermitidosCocinero.includes(estado)) {
        return res.status(403).json({ 
          mensaje: 'No tienes permisos para cambiar a este estado. Estados permitidos: En Cocina, Listo' 
        });
      }
    }

    // 🔥 NUEVO: Permitir a Mozos cambiar a "entregado" desde "listo"
    if (usuarioRol === 'Mozo') {
      const estadosPermitidosMozo = ['entregado', 'cancelado'];
      if (!estadosPermitidosMozo.includes(estado)) {
        return res.status(403).json({ 
          mensaje: 'No tienes permisos para cambiar a este estado. Estados permitidos: Entregado, Cancelado' 
        });
      }

      // Validar que solo pueda cambiar a "entregado" desde "listo"
      const pedidoActual = await Pedido.findById(id);
      if (!pedidoActual) {
        return res.status(404).json({ mensaje: 'Pedido no encontrado' });
      }

      if (estado === 'entregado' && pedidoActual.estado !== 'listo') {
        return res.status(403).json({ 
          mensaje: 'Solo puedes entregar pedidos que estén en estado "Listo"' 
        });
      }
    }

    // Resto del código del controller...
    const pedido = await Pedido.findByIdAndUpdate(
      id,
      { 
        estado: estado,
        fechaActualizacion: Date.now()
      },
      { new: true }
    )
    .populate('mesa', 'numero capacidad piso')
    .populate('mozo', 'nombre')
    .populate('items.producto', 'nombre precio categoria');

    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    console.log(`Pedido ${id} actualizado a estado: ${estado}`);

    res.json(pedido);

  } catch (error) {
    console.error('Error en actualizarEstado:', error);
    res.status(500).json({ mensaje: 'Error al actualizar estado del pedido', error });
  }
};

// 🔍 Obtener pedido por ID
exports.getPedidoById = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await Pedido.findById(id)
      .populate('mesa', 'numero capacidad piso')
      .populate('mozo', 'nombre')
      .populate('items.producto', 'nombre precio categoria');

    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    res.json(pedido);

  } catch (error) {
    console.error('Error en getPedidoById:', error);
    res.status(500).json({ mensaje: 'Error al obtener pedido', error });
  }
};

// Eliminar pedido (solo para pedidos cancelados)
exports.eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await Pedido.findById(id);
    
    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    if (pedido.estado !== 'cancelado') {
      return res.status(400).json({ mensaje: 'Solo se pueden eliminar pedidos cancelados' });
    }

    await Pedido.findByIdAndDelete(id);
    res.json({ mensaje: 'Pedido eliminado correctamente' });

  } catch (error) {
    console.error('Error en eliminarPedido:', error);
    res.status(500).json({ mensaje: 'Error al eliminar pedido', error });
  }
};

// Obtener pedidos por mesa
exports.getPedidosPorMesa = async (req, res) => {
  try {
    const { mesaId } = req.params;

    const pedidos = await Pedido.find({ mesa: mesaId })
      .populate('mesa', 'numero capacidad piso')
      .populate('mozo', 'nombre')
      .populate('items.producto', 'nombre precio categoria')
      .sort({ fechaCreacion: -1 });

    res.json(pedidos);

  } catch (error) {
    console.error('Error en getPedidosPorMesa:', error);
    res.status(500).json({ mensaje: 'Error al obtener pedidos de la mesa', error });
  }
};