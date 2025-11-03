function initModuloReportes() {
  console.log("📈 Módulo Reportes iniciado.");

  // Referencias a elementos
  const formFiltros = document.getElementById('formFiltrosReporte');
  const resultadosContainer = document.getElementById('resultadosContainer');
  const estadisticasContainer = document.getElementById('estadisticasContainer');
  const tablaHead = document.getElementById('tablaReportesHead');
  const tablaBody = document.getElementById('tablaReportesBody');
  const tituloResultados = document.getElementById('tituloResultados');
  const btnExportar = document.getElementById('btnExportarExcel');
  const msgReportes = document.getElementById('msgReportes');

  const apiURL = "http://localhost:4000/api/reportes";
  let datosReporteActual = null;
  let tipoReporteActual = '';

  // Verificar autenticación y rol
  (async () => {
    try {
      const res = await fetch('http://localhost:4000/api/usuarios/me', { credentials: 'include' });
      if (!res.ok) throw new Error('No estás logueado');
      const data = await res.json();

      if (data.usuario.rol !== 'Administrador') {
        alert('Solo administradores pueden ver reportes');
        window.location.href = '/dashboard.html';
        return;
      }

    } catch (err) {
      console.error(err);
      alert('Debes iniciar sesión');
      window.location.href = '/login.html';
    }
  })();

  // 📈 Generar reporte
  formFiltros.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgReportes.textContent = '';

    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    const tipoReporte = document.getElementById('tipoReporte').value;

    if (!fechaDesde || !fechaHasta) {
      msgReportes.textContent = '❌ Debes seleccionar ambas fechas';
      msgReportes.className = 'text-danger';
      return;
    }

    if (new Date(fechaDesde) > new Date(fechaHasta)) {
      msgReportes.textContent = '❌ La fecha desde no puede ser mayor a la fecha hasta';
      msgReportes.className = 'text-danger';
      return;
    }

    try {
      msgReportes.textContent = '⏳ Generando reporte...';
      msgReportes.className = 'text-warning';

      let endpoint = '';
      switch (tipoReporte) {
        case 'ventas': endpoint = '/ventas'; break;
        case 'mozos': endpoint = '/mozos'; break;
        case 'mesas': endpoint = '/mesas'; break;
      }

      const res = await fetch(`${apiURL}${endpoint}?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`, {
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensaje || 'Error al generar reporte');
      }

      datosReporteActual = data;
      tipoReporteActual = tipoReporte;

      // Mostrar resultados
      mostrarResultados(data, tipoReporte);
      btnExportar.disabled = false;
      msgReportes.textContent = '✅ Reporte generado correctamente';
      msgReportes.className = 'text-success';

    } catch (err) {
      console.error('Error generando reporte:', err);
      msgReportes.textContent = '❌ ' + err.message;
      msgReportes.className = 'text-danger';
      resultadosContainer.style.display = 'none';
      btnExportar.disabled = true;
    }
  });

  // 📤 Exportar a Excel
  btnExportar.addEventListener('click', async () => {
    if (!datosReporteActual || !tipoReporteActual) return;

    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;

    try {
      msgReportes.textContent = '⏳ Exportando a Excel...';
      msgReportes.className = 'text-warning';

      const url = `${apiURL}/exportar-excel?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}&tipoReporte=${tipoReporteActual}`;
      
      // Descargar el archivo
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `reporte-${tipoReporteActual}-${fechaDesde}-a-${fechaHasta}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      msgReportes.textContent = '✅ Excel exportado correctamente';
      msgReportes.className = 'text-success';

    } catch (err) {
      console.error('Error exportando Excel:', err);
      msgReportes.textContent = '❌ Error al exportar Excel: ' + err.message;
      msgReportes.className = 'text-danger';
    }
  });

  // 🎨 Mostrar resultados
  function mostrarResultados(data, tipoReporte) {
    resultadosContainer.style.display = 'block';

    // Configurar según el tipo de reporte
    switch (tipoReporte) {
      case 'ventas':
        mostrarReporteVentas(data);
        break;
      case 'mozos':
        mostrarReporteMozos(data);
        break;
      case 'mesas':
        mostrarReporteMesas(data);
        break;
    }
  }

  // 📊 Mostrar reporte de ventas
  function mostrarReporteVentas(data) {
    tituloResultados.textContent = `📊 Reporte de Ventas - ${data.fechaDesde} a ${data.fechaHasta}`;

    // Estadísticas
    estadisticasContainer.innerHTML = `
      <div class="col-md-3">
        <div class="estadistica-card">
          <div class="estadistica-numero text-cantidad">${data.totales.cantidadProductosDiferentes}</div>
          <div class="estadistica-titulo">Productos Vendidos</div>
          <div class="estadistica-descripcion">Diferentes tipos</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="estadistica-card">
          <div class="estadistica-numero text-cantidad">${data.totales.totalProductos}</div>
          <div class="estadistica-titulo">Total Unidades</div>
          <div class="estadistica-descripcion">Cantidad vendida</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="estadistica-card">
          <div class="estadistica-numero text-moneda">S/ ${data.totales.totalGeneral.toFixed(2)}</div>
          <div class="estadistica-titulo">Ventas Totales</div>
          <div class="estadistica-descripcion">Recaudación total</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="estadistica-card">
          <div class="estadistica-numero text-moneda">S/ ${(data.totales.totalGeneral / data.totales.totalProductos).toFixed(2)}</div>
          <div class="estadistica-titulo">Promedio por Unidad</div>
          <div class="estadistica-descripcion">Valor promedio</div>
        </div>
      </div>
    `;

    // Tabla
    tablaHead.innerHTML = `
      <tr>
        <th>Producto</th>
        <th>Categoría</th>
        <th>Cantidad Vendida</th>
        <th>Total Ventas (S/)</th>
        <th>% del Total</th>
      </tr>
    `;

    const totalVentas = data.totales.totalGeneral;
    tablaBody.innerHTML = data.ventas.map(item => {
      const porcentaje = ((item.totalVentas / totalVentas) * 100).toFixed(1);
      return `
        <tr>
          <td>${item.producto}</td>
          <td><span class="badge badge-categoria">${item.categoria}</span></td>
          <td class="text-cantidad">${item.cantidadVendida}</td>
          <td class="text-moneda">S/ ${item.totalVentas.toFixed(2)}</td>
          <td>
            <div class="progress" style="height: 20px;">
              <div class="progress-bar" role="progressbar" style="width: ${porcentaje}%">
                ${porcentaje}%
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 👥 Mostrar reporte de mozos
  function mostrarReporteMozos(data) {
    tituloResultados.textContent = `👥 Reporte de Mozos - ${data.fechaDesde} a ${data.fechaHasta}`;

    // Estadísticas
    const totalVendido = data.mozos.reduce((sum, m) => sum + m.totalVendido, 0);
    estadisticasContainer.innerHTML = `
      <div class="col-md-4">
        <div class="estadistica-card">
          <div class="estadistica-numero text-cantidad">${data.totalMozos}</div>
          <div class="estadistica-titulo">Mozos Activos</div>
          <div class="estadistica-descripcion">Con pedidos registrados</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="estadistica-card">
          <div class="estadistica-numero text-cantidad">${data.mozos.reduce((sum, m) => sum + m.cantidadPedidos, 0)}</div>
          <div class="estadistica-titulo">Total Pedidos</div>
          <div class="estadistica-descripcion">Realizados en el período</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="estadistica-card">
          <div class="estadistica-numero text-moneda">S/ ${totalVendido.toFixed(2)}</div>
          <div class="estadistica-titulo">Total Recaudado</div>
          <div class="estadistica-descripcion">Por todos los mozos</div>
        </div>
      </div>
    `;

    // Tabla
    tablaHead.innerHTML = `
      <tr>
        <th>Mozo</th>
        <th>Cantidad de Pedidos</th>
        <th>Total Vendido (S/)</th>
        <th>Promedio por Pedido (S/)</th>
        <th>% del Total</th>
      </tr>
    `;

    tablaBody.innerHTML = data.mozos.map(mozo => {
      const promedio = mozo.totalVendido / mozo.cantidadPedidos;
      const porcentaje = ((mozo.totalVendido / totalVendido) * 100).toFixed(1);
      return `
        <tr>
          <td><span class="badge badge-mozo">${mozo.nombreMozo}</span></td>
          <td class="text-cantidad">${mozo.cantidadPedidos}</td>
          <td class="text-moneda">S/ ${mozo.totalVendido.toFixed(2)}</td>
          <td class="text-moneda">S/ ${promedio.toFixed(2)}</td>
          <td>
            <div class="progress" style="height: 20px;">
              <div class="progress-bar bg-warning" role="progressbar" style="width: ${porcentaje}%">
                ${porcentaje}%
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 🪑 Mostrar reporte de mesas
  function mostrarReporteMesas(data) {
    tituloResultados.textContent = `🪑 Reporte de Mesas - ${data.fechaDesde} a ${data.fechaHasta}`;

    // Estadísticas
    const mesasActivas = data.mesas.filter(m => m.cantidadPedidos > 0).length;
    const totalRecaudado = data.mesas.reduce((sum, m) => sum + m.totalRecaudado, 0);
    
    estadisticasContainer.innerHTML = `
      <div class="col-md-3">
        <div class="estadistica-card">
          <div class="estadistica-numero text-cantidad">${data.totalMesas}</div>
          <div class="estadistica-titulo">Total Mesas</div>
          <div class="estadistica-descripcion">En el restaurante</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="estadistica-card">
          <div class="estadistica-numero text-cantidad">${mesasActivas}</div>
          <div class="estadistica-titulo">Mesas Activas</div>
          <div class="estadistica-descripcion">Con pedidos registrados</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="estadistica-card">
          <div class="estadistica-numero text-cantidad">${data.mesas.reduce((sum, m) => sum + m.cantidadPedidos, 0)}</div>
          <div class="estadistica-titulo">Total Pedidos</div>
          <div class="estadistica-descripcion">En todas las mesas</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="estadistica-card">
          <div class="estadistica-numero text-moneda">S/ ${totalRecaudado.toFixed(2)}</div>
          <div class="estadistica-titulo">Total Recaudado</div>
          <div class="estadistica-descripcion">Por todas las mesas</div>
        </div>
      </div>
    `;

    // Tabla
    tablaHead.innerHTML = `
      <tr>
        <th>Mesa</th>
        <th>Piso</th>
        <th>Cantidad de Pedidos</th>
        <th>Total Recaudado (S/)</th>
        <th>Promedio por Pedido (S/)</th>
        <th>Estado</th>
      </tr>
    `;

    tablaBody.innerHTML = data.mesas.map(mesa => {
      const estado = mesa.cantidadPedidos > 0 ? 'Activa' : 'Inactiva';
      const estadoClass = mesa.cantidadPedidos > 0 ? 'bg-success' : 'bg-secondary';
      return `
        <tr>
          <td><span class="badge badge-mesa">Mesa ${mesa.numeroMesa}</span></td>
          <td>Piso ${mesa.piso}</td>
          <td class="text-cantidad">${mesa.cantidadPedidos}</td>
          <td class="text-moneda">S/ ${mesa.totalRecaudado.toFixed(2)}</td>
          <td class="text-moneda">S/ ${mesa.promedioPedido.toFixed(2)}</td>
          <td><span class="badge ${estadoClass}">${estado}</span></td>
        </tr>
      `;
    }).join('');
  }
}