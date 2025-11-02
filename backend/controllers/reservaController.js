const Reserva = require('../models/reservaModel');
const Mesa = require('../models/mesaModel');
const Cliente = require('../models/clienteModel');

// Crear una nueva reserva
exports.crearReserva = async (req, res) => {
  try {
    console.log('🔍 DATOS RECIBIDOS EN REQ.BODY:', req.body);

    const { dni, nombres, apellidos, telefono, correo, fecha, horaInicio, horaFin, mesa } = req.body;

    // 1️⃣ Validaciones básicas
    const camposRequeridos = [
      { campo: 'dni', valor: dni },
      { campo: 'nombres', valor: nombres },
      { campo: 'apellidos', valor: apellidos },
      { campo: 'fecha', valor: fecha },
      { campo: 'horaInicio', valor: horaInicio },
      { campo: 'horaFin', valor: horaFin },
      { campo: 'mesa', valor: mesa }
    ];

    const camposFaltantes = camposRequeridos.filter(campo => !campo.valor);
    
    if (camposFaltantes.length > 0) {
      console.log('❌ CAMPOS FALTANTES:', camposFaltantes.map(c => c.campo));
      return res.status(400).json({ 
        mensaje: 'Todos los campos son obligatorios',
        camposFaltantes: camposFaltantes.map(c => c.campo)
      });
    }

    console.log('✅ Todos los campos están presentes');

    // 2️⃣ Buscar si el cliente ya existe por su DNI
    let cliente = await Cliente.findOne({ dni });
    console.log('👤 Cliente encontrado:', cliente ? 'Sí' : 'No');

    // 3️⃣ Si no existe, lo crea automáticamente
    if (!cliente) {
      console.log('👤 Creando nuevo cliente...');
      cliente = new Cliente({ 
        dni, 
        nombres, 
        apellidos, 
        telefono: telefono || '', 
        correo: correo || '' 
      });
      await cliente.save();
      console.log('✅ Cliente creado:', cliente._id);
    } else {
      console.log('✅ Cliente existente encontrado:', cliente._id);
    }

    // 4️⃣ Verificar que la mesa existe
    const mesaExiste = await Mesa.findById(mesa);
    console.log('🪑 Mesa encontrada:', mesaExiste ? `Mesa ${mesaExiste.numero}` : 'No');
    
    if (!mesaExiste) {
      return res.status(404).json({ mensaje: 'Mesa no encontrada' });
    }

    // 5️⃣ Verificar que la mesa esté disponible
    console.log('📊 Estado de la mesa:', mesaExiste.estado);
    if (mesaExiste.estado !== 'Libre') {
      return res.status(400).json({ 
        mensaje: `La mesa no está disponible. Estado actual: ${mesaExiste.estado}` 
      });
    }

    // 6️⃣ Verificar que no hay reservas superpuestas
    const reservaExistente = await Reserva.findOne({
      mesa: mesa,
      fecha: fecha,
      $or: [
        {
          $and: [
            { horaInicio: { $lt: horaFin } },
            { horaFin: { $gt: horaInicio } }
          ]
        }
      ],
      estado: { $in: ['Reservada', 'Ocupada'] }
    });

    if (reservaExistente) {
      console.log('❌ Reserva superpuesta encontrada');
      return res.status(400).json({ 
        mensaje: 'Ya existe una reserva para esta mesa en el horario seleccionado' 
      });
    }

    // 7️⃣ Crear la reserva
    console.log('📅 Creando reserva...');
    
    // 🔥 CORREGIR: No enviar codigoReserva o generar uno único
    const nuevaReserva = new Reserva({
      cliente: cliente._id,
      fecha,
      horaInicio,
      horaFin,
      mesa,
      estado: 'Reservada'
      // 🔥 codigoReserva se genera automáticamente en el pre-save
    });

    await nuevaReserva.save();
    console.log('✅ Reserva creada:', nuevaReserva._id);

    // 8️⃣ Cambiar estado de la mesa a "Reservada"
    await Mesa.findByIdAndUpdate(mesa, { estado: 'Reservada' });
    console.log('✅ Estado de mesa actualizado a Reservada');

    // 9️⃣ Obtener la reserva con datos poblados para la respuesta
    const reservaCompleta = await Reserva.findById(nuevaReserva._id)
      .populate('cliente')
      .populate('mesa', 'numero capacidad piso');

    console.log('🎉 RESERVA CREADA EXITOSAMENTE');
    
    res.status(201).json({ 
      mensaje: 'Reserva creada correctamente', 
      reserva: reservaCompleta 
    });

  } catch (error) {
    console.error('❌ ERROR COMPLETO AL CREAR RESERVA:', error);
    
    // 🔥 MANEJO ESPECÍFICO DEL ERROR DE DUPLICADO
    if (error.code === 11000) {
      // Error de clave duplicada en codigoReserva
      console.log('🔄 Reintentando crear reserva con nuevo código...');
      
      try {
        // Intentar crear la reserva de nuevo (se generará nuevo código automáticamente)
        const reservaRetry = new Reserva({
          cliente: error.op?.cliente,
          fecha: error.op?.fecha,
          horaInicio: error.op?.horaInicio,
          horaFin: error.op?.horaFin,
          mesa: error.op?.mesa,
          estado: 'Reservada'
        });
        
        await reservaRetry.save();
        
        // Actualizar estado de la mesa
        await Mesa.findByIdAndUpdate(error.op?.mesa, { estado: 'Reservada' });
        
        const reservaCompleta = await Reserva.findById(reservaRetry._id)
          .populate('cliente')
          .populate('mesa', 'numero capacidad piso');

        return res.status(201).json({ 
          mensaje: 'Reserva creada correctamente', 
          reserva: reservaCompleta 
        });
        
      } catch (retryError) {
        console.error('❌ Error en reintento:', retryError);
        return res.status(500).json({ 
          mensaje: 'Error al crear reserva después de reintento' 
        });
      }
    }
    
    // Mensajes de error más específicos
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        mensaje: 'Error de validación en los datos',
        detalles: error.message 
      });
    }

    res.status(500).json({ 
      mensaje: 'Error interno del servidor al crear la reserva',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Listar reservas
exports.listarReservas = async (req, res) => {
  try {
    const reservas = await Reserva.find()
      .populate('cliente')
      .populate('mesa', 'numero capacidad piso estado')
      .sort({ fecha: 1, horaInicio: 1 });

    res.json(reservas);
  } catch (error) {
    console.error('Error al listar reservas:', error);
    res.status(500).json({ mensaje: 'Error al obtener reservas', error });
  }
};

// Actualizar reserva
exports.actualizarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const reserva = await Reserva.findByIdAndUpdate(
      id, 
      { estado }, 
      { new: true }
    ).populate('cliente').populate('mesa');

    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    // Si cambia el estado a Completada o Cancelada, liberar la mesa
    if (estado === 'Completada' || estado === 'Cancelada') {
      await Mesa.findByIdAndUpdate(reserva.mesa._id, { estado: 'Libre' });
    }

    res.json(reserva);
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    res.status(500).json({ mensaje: 'Error al actualizar reserva', error });
  }
};

// Eliminar reserva
exports.eliminarReserva = async (req, res) => {
  try {
    const { id } = req.params;

    const reserva = await Reserva.findById(id);
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    // Liberar mesa antes de eliminar la reserva
    await Mesa.findByIdAndUpdate(reserva.mesa, { estado: 'Libre' });
    
    await Reserva.findByIdAndDelete(id);

    res.json({ mensaje: 'Reserva eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    res.status(500).json({ mensaje: 'Error al eliminar reserva', error });
  }
};