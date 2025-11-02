  const Pedido = require('../models/pedidoModel');
  const Producto = require('../models/productoModel');
  const Mesa = require('../models/mesaModel');
  const Usuario = require('../models/usuarioModel');
  const Reserva = require('../models/reservaModel');
  const ExcelJS = require('exceljs');

  // 📊 Reporte de ventas por fecha
  exports.reporteVentas = async (req, res) => {
    try {
      const { fechaDesde, fechaHasta, tipo } = req.query;
      
      // Validar fechas
      if (!fechaDesde || !fechaHasta) {
        return res.status(400).json({ mensaje: 'Las fechas desde y hasta son requeridas' });
      }

      const startDate = new Date(fechaDesde);
      const endDate = new Date(fechaHasta + 'T23:59:59.999Z');

      // Pipeline de agregación para reporte de ventas
      const pipeline = [
        {
          $match: {
            estado: 'pagado',
            fechaCreacion: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $lookup: {
            from: 'productos',
            localField: 'items.producto',
            foreignField: '_id',
            as: 'productoInfo'
          }
        },
        {
          $unwind: '$productoInfo'
        },
        {
          $group: {
            _id: {
              producto: '$productoInfo.nombre',
              categoria: '$productoInfo.categoria'
            },
            cantidadVendida: { $sum: '$items.cantidad' },
            totalVentas: { $sum: { $multiply: ['$items.cantidad', '$items.precioUnitario'] } }
          }
        },
        {
          $project: {
            _id: 0,
            producto: '$_id.producto',
            categoria: '$_id.categoria',
            cantidadVendida: 1,
            totalVentas: { $round: ['$totalVentas', 2] }
          }
        },
        {
          $sort: { totalVentas: -1 }
        }
      ];

      const ventas = await Pedido.aggregate(pipeline);

      // Calcular totales
      const totalGeneral = ventas.reduce((sum, item) => sum + item.totalVentas, 0);
      const totalProductos = ventas.reduce((sum, item) => sum + item.cantidadVendida, 0);

      res.json({
        fechaDesde: fechaDesde,
        fechaHasta: fechaHasta,
        ventas: ventas,
        totales: {
          totalGeneral: Math.round(totalGeneral * 100) / 100,
          totalProductos: totalProductos,
          cantidadProductosDiferentes: ventas.length
        }
      });

    } catch (error) {
      console.error('Error en reporteVentas:', error);
      res.status(500).json({ mensaje: 'Error al generar reporte de ventas', error });
    }
  };

  // 📈 Reporte de pedidos por mozo
  exports.reporteMozos = async (req, res) => {
    try {
      const { fechaDesde, fechaHasta } = req.query;

      if (!fechaDesde || !fechaHasta) {
        return res.status(400).json({ mensaje: 'Las fechas desde y hasta son requeridas' });
      }

      const startDate = new Date(fechaDesde);
      const endDate = new Date(fechaHasta + 'T23:59:59.999Z');

      const pipeline = [
        {
          $match: {
            estado: 'pagado',
            fechaCreacion: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $lookup: {
            from: 'usuarios',
            localField: 'mozo',
            foreignField: '_id',
            as: 'mozoInfo'
          }
        },
        {
          $unwind: '$mozoInfo'
        },
        {
          $group: {
            _id: '$mozo',
            nombreMozo: { $first: '$mozoInfo.nombre' },
            cantidadPedidos: { $sum: 1 },
            totalVendido: { $sum: '$total' }
          }
        },
        {
          $project: {
            _id: 0,
            mozoId: '$_id',
            nombreMozo: 1,
            cantidadPedidos: 1,
            totalVendido: { $round: ['$totalVendido', 2] }
          }
        },
        {
          $sort: { totalVendido: -1 }
        }
      ];

      const reporteMozos = await Pedido.aggregate(pipeline);

      res.json({
        fechaDesde: fechaDesde,
        fechaHasta: fechaHasta,
        mozos: reporteMozos,
        totalMozos: reporteMozos.length
      });

    } catch (error) {
      console.error('Error en reporteMozos:', error);
      res.status(500).json({ mensaje: 'Error al generar reporte de mozos', error });
    }
  };

  // 🪑 Reporte de ocupación de mesas
  exports.reporteMesas = async (req, res) => {
    try {
      const { fechaDesde, fechaHasta } = req.query;

      if (!fechaDesde || !fechaHasta) {
        return res.status(400).json({ mensaje: 'Las fechas desde y hasta son requeridas' });
      }

      const startDate = new Date(fechaDesde);
      const endDate = new Date(fechaHasta + 'T23:59:59.999Z');

      const pipeline = [
        {
          $match: {
            fechaCreacion: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $lookup: {
            from: 'mesas',
            localField: 'mesa',
            foreignField: '_id',
            as: 'mesaInfo'
          }
        },
        {
          $unwind: '$mesaInfo'
        },
        {
          $group: {
            _id: '$mesa',
            numeroMesa: { $first: '$mesaInfo.numero' },
            piso: { $first: '$mesaInfo.piso' },
            cantidadPedidos: { $sum: 1 },
            totalRecaudado: { $sum: '$total' },
            promedioPedido: { $avg: '$total' }
          }
        },
        {
          $project: {
            _id: 0,
            mesaId: '$_id',
            numeroMesa: 1,
            piso: 1,
            cantidadPedidos: 1,
            totalRecaudado: { $round: ['$totalRecaudado', 2] },
            promedioPedido: { $round: ['$promedioPedido', 2] }
          }
        },
        {
          $sort: { totalRecaudado: -1 }
        }
      ];

      const reporteMesas = await Pedido.aggregate(pipeline);

      // Obtener todas las mesas para incluir las que no tuvieron pedidos
      const todasLasMesas = await Mesa.find();
      const mesasConPedidos = new Map(reporteMesas.map(m => [m.mesaId.toString(), m]));

      const mesasCompletas = todasLasMesas.map(mesa => {
        const reporte = mesasConPedidos.get(mesa._id.toString());
        return reporte || {
          mesaId: mesa._id,
          numeroMesa: mesa.numero,
          piso: mesa.piso,
          cantidadPedidos: 0,
          totalRecaudado: 0,
          promedioPedido: 0
        };
      });

      res.json({
        fechaDesde: fechaDesde,
        fechaHasta: fechaHasta,
        mesas: mesasCompletas,
        totalMesas: todasLasMesas.length,
        mesasActivas: reporteMesas.length
      });

    } catch (error) {
      console.error('Error en reporteMesas:', error);
      res.status(500).json({ mensaje: 'Error al generar reporte de mesas', error });
    }
  };

  // 📤 Exportar a Excel
  exports.exportarExcel = async (req, res) => {
    try {
      const { fechaDesde, fechaHasta, tipoReporte } = req.query;

      if (!fechaDesde || !fechaHasta || !tipoReporte) {
        return res.status(400).json({ mensaje: 'Parámetros incompletos' });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte');

      let datos = [];
      let titulo = '';

      // Obtener datos según el tipo de reporte
      switch (tipoReporte) {
        case 'ventas':
          const reporteVentas = await exports.reporteVentasInterno(fechaDesde, fechaHasta);
          datos = reporteVentas.ventas;
          titulo = `Reporte de Ventas - ${fechaDesde} a ${fechaHasta}`;
          
          // Configurar columnas para ventas
          worksheet.columns = [
            { header: 'Producto', key: 'producto', width: 30 },
            { header: 'Categoría', key: 'categoria', width: 20 },
            { header: 'Cantidad Vendida', key: 'cantidadVendida', width: 15 },
            { header: 'Total Ventas (S/)', key: 'totalVentas', width: 15 }
          ];
          break;

        case 'mozos':
          const reporteMozos = await exports.reporteMozosInterno(fechaDesde, fechaHasta);
          datos = reporteMozos.mozos;
          titulo = `Reporte de Mozos - ${fechaDesde} a ${fechaHasta}`;
          
          worksheet.columns = [
            { header: 'Mozo', key: 'nombreMozo', width: 25 },
            { header: 'Cantidad de Pedidos', key: 'cantidadPedidos', width: 20 },
            { header: 'Total Vendido (S/)', key: 'totalVendido', width: 15 }
          ];
          break;

        case 'mesas':
          const reporteMesas = await exports.reporteMesasInterno(fechaDesde, fechaHasta);
          datos = reporteMesas.mesas;
          titulo = `Reporte de Mesas - ${fechaDesde} a ${fechaHasta}`;
          
          worksheet.columns = [
            { header: 'Mesa', key: 'numeroMesa', width: 10 },
            { header: 'Piso', key: 'piso', width: 10 },
            { header: 'Cantidad de Pedidos', key: 'cantidadPedidos', width: 20 },
            { header: 'Total Recaudado (S/)', key: 'totalRecaudado', width: 20 },
            { header: 'Promedio por Pedido (S/)', key: 'promedioPedido', width: 20 }
          ];
          break;

        default:
          return res.status(400).json({ mensaje: 'Tipo de reporte no válido' });
      }

      // Agregar título
      worksheet.addRow([]);
      worksheet.mergeCells('A1:D1');
      worksheet.getCell('A1').value = titulo;
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      // Agregar encabezados
      worksheet.addRow([]);
      worksheet.addRow(worksheet.columns.map(col => col.header));

      // Estilo para encabezados
      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5496' }
      };

      // Agregar datos
      datos.forEach(item => {
        worksheet.addRow(item);
      });

      // Agregar totales
      worksheet.addRow([]);
      worksheet.addRow(['Total de registros:', datos.length]);

      // Configurar respuesta
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=reporte-${tipoReporte}-${fechaDesde}-a-${fechaHasta}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error en exportarExcel:', error);
      res.status(500).json({ mensaje: 'Error al exportar a Excel', error });
    }
  };

  // Funciones internas para reutilizar lógica
  exports.reporteVentasInterno = async (fechaDesde, fechaHasta) => {
    const startDate = new Date(fechaDesde);
    const endDate = new Date(fechaHasta + 'T23:59:59.999Z');

    const pipeline = [
      {
        $match: {
          estado: 'pagado',
          fechaCreacion: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'productos',
          localField: 'items.producto',
          foreignField: '_id',
          as: 'productoInfo'
        }
      },
      {
        $unwind: '$productoInfo'
      },
      {
        $group: {
          _id: {
            producto: '$productoInfo.nombre',
            categoria: '$productoInfo.categoria'
          },
          cantidadVendida: { $sum: '$items.cantidad' },
          totalVentas: { $sum: { $multiply: ['$items.cantidad', '$items.precioUnitario'] } }
        }
      },
      {
        $project: {
          _id: 0,
          producto: '$_id.producto',
          categoria: '$_id.categoria',
          cantidadVendida: 1,
          totalVentas: { $round: ['$totalVentas', 2] }
        }
      },
      {
        $sort: { totalVentas: -1 }
      }
    ];

    const ventas = await Pedido.aggregate(pipeline);
    const totalGeneral = ventas.reduce((sum, item) => sum + item.totalVentas, 0);

    return {
      ventas: ventas,
      totales: {
        totalGeneral: Math.round(totalGeneral * 100) / 100,
        totalProductos: ventas.reduce((sum, item) => sum + item.cantidadVendida, 0)
      }
    };
  };

  exports.reporteMozosInterno = async (fechaDesde, fechaHasta) => {
    const startDate = new Date(fechaDesde);
    const endDate = new Date(fechaHasta + 'T23:59:59.999Z');

    const pipeline = [
      {
        $match: {
          estado: 'pagado',
          fechaCreacion: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $lookup: {
          from: 'usuarios',
          localField: 'mozo',
          foreignField: '_id',
          as: 'mozoInfo'
        }
      },
      {
        $unwind: '$mozoInfo'
      },
      {
        $group: {
          _id: '$mozo',
          nombreMozo: { $first: '$mozoInfo.nombre' },
          cantidadPedidos: { $sum: 1 },
          totalVendido: { $sum: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          mozoId: '$_id',
          nombreMozo: 1,
          cantidadPedidos: 1,
          totalVendido: { $round: ['$totalVendido', 2] }
        }
      }
    ];

    const mozos = await Pedido.aggregate(pipeline);
    return { mozos: mozos };
  };

  exports.reporteMesasInterno = async (fechaDesde, fechaHasta) => {
    const startDate = new Date(fechaDesde);
    const endDate = new Date(fechaHasta + 'T23:59:59.999Z');

    const pipeline = [
      {
        $match: {
          fechaCreacion: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $lookup: {
          from: 'mesas',
          localField: 'mesa',
          foreignField: '_id',
          as: 'mesaInfo'
        }
      },
      {
        $unwind: '$mesaInfo'
      },
      {
        $group: {
          _id: '$mesa',
          numeroMesa: { $first: '$mesaInfo.numero' },
          piso: { $first: '$mesaInfo.piso' },
          cantidadPedidos: { $sum: 1 },
          totalRecaudado: { $sum: '$total' },
          promedioPedido: { $avg: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          mesaId: '$_id',
          numeroMesa: 1,
          piso: 1,
          cantidadPedidos: 1,
          totalRecaudado: { $round: ['$totalRecaudado', 2] },
          promedioPedido: { $round: ['$promedioPedido', 2] }
        }
      }
    ];

    const mesas = await Pedido.aggregate(pipeline);
    return { mesas: mesas };
  };