const Reserva = require('../models/reservaModel');
const Mesa = require('../models/mesaModel');
const Cliente = require('../models/clienteModel');

// Crear una nueva reserva
exports.crearReserva = async (req, res) => {
  try {
    const { dni, nombres, apellidos, telefono, correo, fecha, horaInicio, horaFin, mesa } = req.body;

    // 1️⃣ Buscar si el cliente ya existe por su DNI
    let cliente = await Cliente.findOne({ dni });

    // 2️⃣ Si no existe, lo crea automáticamente
    if (!cliente) {
      cliente = new Cliente({ dni, nombres, apellidos, telefono, correo });
      await cliente.save();
    }

    // 3️⃣ Crear la reserva con la referencia del cliente
    const nuevaReserva = new Reserva({
      cliente: cliente._id,
      fecha,
      horaInicio,
      horaFin,
      mesa,
      estado: 'Reservada'
    });

    await nuevaReserva.save();

    // 4️⃣ Cambiar estado de la mesa a “Reservada”
    await Mesa.findByIdAndUpdate(mesa, { estado: 'Reservada' });

    res.status(201).json({ mensaje: 'Reserva creada correctamente', reserva: nuevaReserva });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear la reserva' });
  }
};

// Listar reservas
exports.listarReservas = async (req, res) => {
  try {
    const reservas = await Reserva.find()
      .populate('cliente')
      .populate('mesa');
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar reserva (por ejemplo, cambiar estado)
exports.actualizarReserva = async (req, res) => {
  try {
    const reserva = await Reserva.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Si cambia el estado a Completada o Cancelada, liberar la mesa
    if (req.body.estado === 'Completada' || req.body.estado === 'Cancelada') {
      await Mesa.findByIdAndUpdate(reserva.mesa, { estado: 'Libre' });
    }

    res.json(reserva);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar reserva
exports.eliminarReserva = async (req, res) => {
  try {
    const reserva = await Reserva.findByIdAndDelete(req.params.id);

    // Liberar mesa si la reserva existía
    if (reserva) {
      await Mesa.findByIdAndUpdate(reserva.mesa, { estado: 'Libre' });
    }

    res.json({ message: 'Reserva eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
