const express = require('express');
const router = express.Router();
const Cliente = require('../models/clienteModel');

// ➕ Crear cliente
router.post('/', async (req, res) => {
  try {
    const nuevoCliente = new Cliente(req.body);
    await nuevoCliente.save();
    res.status(201).json(nuevoCliente);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Listar clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Buscar cliente por DNI
router.get('/:dni', async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ dni: req.params.dni });
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Buscar o crear cliente automáticamente
router.post('/buscar-o-crear', async (req, res) => {
  try {
    const { dni, nombres, apellidos, correo, telefono } = req.body;

    if (!dni) {
      return res.status(400).json({ message: 'El DNI es obligatorio' });
    }

    let cliente = await Cliente.findOne({ dni });

    if (!cliente) {
      cliente = new Cliente({ dni, nombres, apellidos, correo, telefono });
      await cliente.save();
      console.log('Cliente creado automáticamente');
    } else {
      console.log('Cliente existente encontrado');
    }

    res.json(cliente);
  } catch (error) {
    console.error('Error en buscar-o-crear:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
