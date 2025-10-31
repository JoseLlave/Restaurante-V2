const Mesa = require('../models/mesaModel');

exports.getMesas = async (req, res) => {
  try {
    const mesas = await Mesa.find();
    res.json(mesas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mesas', error });
  }
};

exports.crearMesa = async (req, res) => {
  try {
    const nuevaMesa = new Mesa(req.body);
    await nuevaMesa.save();
    res.status(201).json(nuevaMesa);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear mesa', error });
  }
};

// Actualizar mesa completa
exports.actualizarMesa = async (req, res) => {
  try {
    const mesa = await Mesa.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!mesa) return res.status(404).json({ message: 'Mesa no encontrada' });
    res.json(mesa);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar mesa', error });
  }
};

// Actualizar solo estado
exports.actualizarEstadoMesa = async (req, res) => {
  try {
    const { estado } = req.body;
    const mesa = await Mesa.findByIdAndUpdate(req.params.id, { estado, fechaActualizacion: Date.now() }, { new: true });
    if (!mesa) return res.status(404).json({ message: 'Mesa no encontrada' });
    res.json(mesa);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar estado', error });
  }
};

// Eliminar mesa
exports.eliminarMesa = async (req, res) => {
  try {
    const mesa = await Mesa.findByIdAndDelete(req.params.id);
    if (!mesa) return res.status(404).json({ message: 'Mesa no encontrada' });
    res.json({ message: 'Mesa eliminada' });
  } catch (error) {
    res.status(400).json({ message: 'Error al eliminar mesa', error });
  }
};
