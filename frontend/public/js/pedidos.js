function initModuloPedidos() {
  console.log("🍽️ Módulo Pedidos iniciado.");

  // Referencias a elementos
  const tablaBody = document.getElementById('tablaPedidosBody');
  const filtroEstado = document.getElementById('filtroEstadoPedido');
  const btnActualizar = document.getElementById('btnActualizarPedidos');
  const selectMesa = document.getElementById('selectMesaPedido');
  const selectProducto = document.getElementById('selectProductoPedido');
  const btnAgregarProducto = document.getElementById('btnAgregarProducto');
  const btnConfirmarPedido = document.getElementById('btnCrearPedido');
  const tablaItemsBody = document.getElementById('tablaItemsPedido');
  const totalPedido = document.getElementById('totalPedido');

  const apiURL = "http://localhost:4000/api/pedidos";
  const apiMesas = "http://localhost:4000/api/mesas";
  const apiProductos = "http://localhost:4000/api/productos/activos";

  let itemsPedido = [];
  let usuarioRol = '';

  // Verificar autenticación y cargar datos
  (async () => {
    try {
      const res = await fetch('http://localhost:4000/api/usuarios/me', { credentials: 'include' });
      if (!res.ok) throw new Error('No estás logueado');
      const data = await res.json();

      usuarioRol = data.usuario.rol;
      
      console.log(`👤 Usuario rol: ${usuarioRol}`);

      // 🔥 SOLO MOZOS pueden crear pedidos
      if (btnConfirmarPedido && usuarioRol !== 'Mozo') {
        btnConfirmarPedido.style.display = 'none';
        // Ocultar también la sección de crear pedido
        const seccionCrearPedido = document.querySelector('.card:first-child');
        if (seccionCrearPedido) {
          seccionCrearPedido.style.display = 'none';
        }
      }

      await cargarPedidos();
      await cargarMesasParaPedido();
      await cargarProductosParaPedido();

    } catch (err) {
      console.error(err);
      alert('Debes iniciar sesión');
      window.location.href = '/login.html';
    }
  })();

  // 📋 Cargar pedidos
  async function cargarPedidos() {
    try {
      let url = apiURL;
      if (filtroEstado && filtroEstado.value !== 'todos') {
        url += `?estado=${filtroEstado.value}`;
      }
      
      const res = await fetch(url, { credentials: 'include' });
      const pedidos = await res.json();

      if (!res.ok) {
        if (tablaBody) {
          tablaBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar pedidos</td></tr>';
        }
        return;
      }

      if (!Array.isArray(pedidos) || pedidos.length === 0) {
        if (tablaBody) {
          tablaBody.innerHTML = '<tr><td colspan="8" class="text-center">No hay pedidos registrados</td></tr>';
        }
        return;
      }

      if (tablaBody) {
        tablaBody.innerHTML = pedidos.map(pedido => `
          <tr>
            <td>${pedido._id ? pedido._id.substring(18) : 'N/A'}</td>
            <td>
              <span class="badge bg-info">Mesa ${pedido.mesa?.numero || 'N/A'}</span>
              <small class="text-muted d-block">Piso ${pedido.mesa?.piso || 'N/A'}</small>
            </td>
            <td>${pedido.mozo?.nombre || 'N/A'}</td>
            <td>
              <div class="items-lista">
                ${Array.isArray(pedido.items) ? pedido.items.map(item => `
                  <div class="item-producto">
                    <span>${item.producto?.nombre || 'Producto'}</span>
                    <span class="text-cantidad">x${item.cantidad || 0}</span>
                  </div>
                `).join('') : 'Sin productos'}
              </div>
            </td>
            <td class="text-moneda">S/ ${pedido.total ? pedido.total.toFixed(2) : '0.00'}</td>
            <td>
              <span class="badge ${obtenerClaseEstado(pedido.estado)}">
                ${obtenerTextoEstado(pedido.estado)}
              </span>
            </td>
            <td>${pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleString('es-PE') : 'N/A'}</td>
            <td>
              ${generarBotonesAccion(pedido)}
            </td>
          </tr>
        `).join('');
      }

    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      if (tablaBody) {
        tablaBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error de conexión</td></tr>';
      }
    }
  }

  // 🆕 Cargar mesas para nuevo pedido - 🔥 CORREGIDO
  async function cargarMesasParaPedido() {
    try {
      console.log("🔄 Cargando mesas...");
      const res = await fetch(apiMesas, { credentials: 'include' });
      
      if (!res.ok) {
        console.error(`❌ Error ${res.status} al cargar mesas`);
        return;
      }

      const mesas = await res.json();
      console.log(`✅ ${mesas ? mesas.length : 0} mesas cargadas:`, mesas);

      if (Array.isArray(mesas) && selectMesa) {
        selectMesa.innerHTML = '<option value="">Seleccionar mesa</option>';
        
        // 🔥 CORREGIDO: Mesas RESERVADAS son las disponibles para pedidos
        const mesasDisponibles = mesas.filter(mesa => 
          mesa.estado === 'Reservada' || mesa.estado === 'Ocupada'
        );
        
        console.log(`🪑 ${mesasDisponibles.length} mesas disponibles para pedidos`);
        
        if (mesasDisponibles.length === 0) {
          selectMesa.innerHTML = '<option value="">No hay mesas con reserva activa</option>';
          return;
        }

        mesasDisponibles.forEach(mesa => {
          const option = document.createElement('option');
          option.value = mesa._id;
          
          // 🔥 Mostrar información clara del estado
          let estadoTexto = '';
          let estadoColor = '';
          
          if (mesa.estado === 'Reservada') {
            estadoTexto = '🟡 Reservada';
            estadoColor = 'text-warning';
          } else if (mesa.estado === 'Ocupada') {
            estadoTexto = '🔴 Ocupada';
            estadoColor = 'text-danger';
          }
          
          option.textContent = `Mesa ${mesa.numero} (Piso ${mesa.piso}) - ${estadoTexto} - Cap: ${mesa.capacidad}`;
          option.dataset.estado = mesa.estado;
          
          selectMesa.appendChild(option);
        });
      } else {
        console.error('❌ Mesas no es un array o selectMesa no existe');
      }
    } catch (err) {
      console.error('Error cargando mesas:', err);
    }
  }

  // 🍽️ Cargar productos para nuevo pedido
  async function cargarProductosParaPedido() {
    try {
      console.log("🔄 Cargando productos activos...");
      
      let res = await fetch(apiProductos);
      
      if (!res.ok) {
        console.log("⚠️ Intentando con credentials...");
        res = await fetch(apiProductos, { credentials: 'include' });
      }

      if (!res.ok) {
        throw new Error(`Error ${res.status} al cargar productos`);
      }

      const productos = await res.json();

      if (Array.isArray(productos) && selectProducto) {
        selectProducto.innerHTML = '<option value="">Seleccionar producto</option>';
        productos.forEach(producto => {
          const option = document.createElement('option');
          option.value = producto._id;
          option.textContent = `${producto.nombre} - S/ ${producto.precio?.toFixed(2) || '0.00'} (Stock: ${producto.stock || 0})`;
          option.dataset.precio = producto.precio || 0;
          option.dataset.stock = producto.stock || 0;
          selectProducto.appendChild(option);
        });
        console.log(`✅ ${productos.length} productos cargados`);
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
      // Fallback: cargar desde pedidos existentes
      await cargarProductosDesdePedidos();
    }
  }

  // 🔥 NUEVA FUNCIÓN: Fallback para cargar productos desde pedidos existentes
  async function cargarProductosDesdePedidos() {
    try {
      const res = await fetch(apiURL, { credentials: 'include' });
      const pedidos = await res.json();
      
      if (res.ok && Array.isArray(pedidos) && selectProducto) {
        const productosUnicos = [];
        const productosMap = new Map();
        
        pedidos.forEach(pedido => {
          if (Array.isArray(pedido.items)) {
            pedido.items.forEach(item => {
              if (item.producto && !productosMap.has(item.producto._id)) {
                productosMap.set(item.producto._id, true);
                productosUnicos.push({
                  _id: item.producto._id,
                  nombre: item.producto.nombre,
                  precio: item.precioUnitario || 0,
                  stock: 99
                });
              }
            });
          }
        });
        
        if (productosUnicos.length > 0) {
          selectProducto.innerHTML = '<option value="">Seleccionar producto</option>';
          productosUnicos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto._id;
            option.textContent = `${producto.nombre} - S/ ${producto.precio.toFixed(2)}`;
            option.dataset.precio = producto.precio;
            option.dataset.stock = producto.stock;
            selectProducto.appendChild(option);
          });
          console.log(`🔄 ${productosUnicos.length} productos cargados desde pedidos existentes`);
        }
      }
    } catch (error) {
      console.error('Error en fallback de productos:', error);
    }
  }

  // ➕ Agregar producto al pedido
  if (btnAgregarProducto) {
    btnAgregarProducto.addEventListener('click', () => {
      if (!selectProducto || !selectProducto.value) {
        alert('Selecciona un producto');
        return;
      }

      const productoSelect = selectProducto.options[selectProducto.selectedIndex];
      const productoId = selectProducto.value;
      const cantidadInput = document.getElementById('cantidadProducto');
      const observacionesInput = document.getElementById('observacionesItem');
      
      const cantidad = cantidadInput ? parseInt(cantidadInput.value) || 1 : 1;
      const observaciones = observacionesInput ? observacionesInput.value : '';

      if (!productoId || !cantidad) {
        alert('Selecciona un producto y cantidad');
        return;
      }

      const precio = parseFloat(productoSelect.dataset.precio) || 0;
      const stock = parseInt(productoSelect.dataset.stock) || 0;
      const nombre = productoSelect.text.split(' - ')[0];

      if (cantidad > stock) {
        alert(`Stock insuficiente. Solo hay ${stock} unidades disponibles.`);
        return;
      }

      // Verificar si el producto ya está en el pedido
      const itemExistente = itemsPedido.find(item => item.productoId === productoId);
      if (itemExistente) {
        itemExistente.cantidad += cantidad;
        itemExistente.subtotal = itemExistente.cantidad * precio;
      } else {
        itemsPedido.push({
          productoId: productoId,
          nombre: nombre,
          cantidad: cantidad,
          precioUnitario: precio,
          observaciones: observaciones,
          subtotal: cantidad * precio
        });
      }

      actualizarTablaItems();
      limpiarFormularioItem();
    });
  }

  // 🗑️ Eliminar item del pedido
  window.eliminarItem = (index) => {
    itemsPedido.splice(index, 1);
    actualizarTablaItems();
  };

  // 📊 Actualizar tabla de items
  function actualizarTablaItems() {
    if (!tablaItemsBody) return;
    
    if (itemsPedido.length === 0) {
      tablaItemsBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay productos agregados</td></tr>';
      if (totalPedido) totalPedido.textContent = 'S/ 0.00';
      if (btnConfirmarPedido) btnConfirmarPedido.disabled = true;
      return;
    }

    tablaItemsBody.innerHTML = itemsPedido.map((item, index) => `
      <tr>
        <td>${item.nombre}</td>
        <td class="text-cantidad">${item.cantidad}</td>
        <td class="text-moneda">S/ ${item.precioUnitario.toFixed(2)}</td>
        <td class="text-moneda">S/ ${item.subtotal.toFixed(2)}</td>
        <td>${item.observaciones || '-'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="eliminarItem(${index})">🗑️</button>
        </td>
      </tr>
    `).join('');

    const total = itemsPedido.reduce((sum, item) => sum + item.subtotal, 0);
    if (totalPedido) totalPedido.textContent = `S/ ${total.toFixed(2)}`;
    if (btnConfirmarPedido) btnConfirmarPedido.disabled = false;
  }

  // 🧹 Limpiar formulario de item
  function limpiarFormularioItem() {
    const cantidadInput = document.getElementById('cantidadProducto');
    const observacionesInput = document.getElementById('observacionesItem');
    
    if (cantidadInput) cantidadInput.value = 1;
    if (observacionesInput) observacionesInput.value = '';
  }

  // ✅ Confirmar pedido - 🔥 SOLO MOZOS
  if (btnConfirmarPedido) {
    btnConfirmarPedido.addEventListener('click', async () => {
      // 🔥 VERIFICAR QUE SEA MOZO
      if (usuarioRol !== 'Mozo') {
        alert('❌ Solo los mozos pueden crear pedidos');
        return;
      }

      const mesaId = selectMesa ? selectMesa.value : null;
      
      if (!mesaId) {
        alert('Selecciona una mesa');
        return;
      }

      if (itemsPedido.length === 0) {
        alert('Agrega al menos un producto al pedido');
        return;
      }

      try {
        const pedidoData = {
          mesaId: mesaId,
          items: itemsPedido.map(item => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            observaciones: item.observaciones
          })),
          observacionesGenerales: document.getElementById('observacionesGenerales') ? 
            document.getElementById('observacionesGenerales').value : ''
        };

        const res = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(pedidoData)
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.mensaje || 'Error al crear pedido');
        }

        alert('✅ Pedido creado correctamente');
        resetearPedido();
        await cargarPedidos();
        await cargarMesasParaPedido();

      } catch (err) {
        console.error('Error creando pedido:', err);
        alert('❌ Error al crear pedido: ' + err.message);
      }
    });
  }

  // 🔄 Resetear pedido
  function resetearPedido() {
    itemsPedido = [];
    const formNuevoPedido = document.getElementById('formNuevoPedido');
    if (formNuevoPedido) {
      formNuevoPedido.reset();
    }
    actualizarTablaItems();
  }

  // 🎯 Generar botones de acción según rol y estado - 🔥 FLUJO CORREGIDO
  function generarBotonesAccion(pedido) {
      if (!pedido || !pedido.estado) return '';
      
      const botones = [];
      
      // 🔥 FLUJO CORREGIDO:
      // 1. MOZOS: Crean pedidos y entregan pedidos listos
      if (usuarioRol === 'Mozo') {
        if (pedido.estado === 'listo') {
          botones.push(`<button class="btn btn-sm btn-primary btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'entregado')">📦 Entregar</button>`);
        }
        
        // Mozos pueden ver detalles y cancelar sus pedidos
        botones.push(`<button class="btn btn-sm btn-outline-info" onclick="verDetallesPedido('${pedido._id}')">👁️ Ver</button>`);
        
        if (pedido.estado === 'creado') {
          botones.push(`<button class="btn btn-sm btn-danger btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'cancelado')">❌ Cancelar</button>`);
        }

        if (puedeEditarPedido(pedido.fechaCreacion)) {
          botones.push(`<button class="btn btn-sm btn-warning btn-accion" onclick="editarPedido('${pedido._id}')">✏️ Editar</button>`);
        }
      }
      
      // 2. COCINEROS: Cambian estados de cocina (solo en_cocina y listo)
      else if (usuarioRol === 'Cocinero') {
        if (pedido.estado === 'creado') {
          botones.push(`<button class="btn btn-sm btn-warning btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'en_cocina')">👨‍🍳 Cocinar</button>`);
        }
        if (pedido.estado === 'en_cocina') {
          botones.push(`<button class="btn btn-sm btn-success btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'listo')">✅ Listo</button>`);
        }
        
        // Cocineros pueden ver detalles
        botones.push(`<button class="btn btn-sm btn-outline-info" onclick="verDetallesPedido('${pedido._id}')">👁️ Ver</button>`);
      }

      // 3. ADMINISTRADORES: Pueden hacer todo
      else if (usuarioRol === 'Administrador') {
        // Estados de cocina
        if (pedido.estado === 'creado') {
          botones.push(`<button class="btn btn-sm btn-warning btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'en_cocina')">👨‍🍳 Cocinar</button>`);
        }
        if (pedido.estado === 'en_cocina') {
          botones.push(`<button class="btn btn-sm btn-success btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'listo')">✅ Listo</button>`);
        }
        if (pedido.estado === 'listo') {
          botones.push(`<button class="btn btn-sm btn-primary btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'entregado')">📦 Entregar</button>`);
        }
        if (pedido.estado === 'entregado') {
          botones.push(`<button class="btn btn-sm btn-success btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'pagado')">💳 Pagar</button>`);
        }
        
        // Ver y cancelar
        botones.push(`<button class="btn btn-sm btn-outline-info" onclick="verDetallesPedido('${pedido._id}')">👁️ Ver</button>`);
        
        if (!['pagado', 'cancelado'].includes(pedido.estado)) {
          botones.push(`<button class="btn btn-sm btn-danger btn-accion" onclick="cambiarEstadoPedido('${pedido._id}', 'cancelado')">❌ Cancelar</button>`);
        }
      }

      return botones.join(' ');
  }

  // 🔥 NUEVA FUNCIÓN: Obtener clase CSS para el estado
  function obtenerClaseEstado(estado) {
    const clases = {
      'creado': 'bg-secondary',
      'en_cocina': 'bg-warning',
      'listo': 'bg-success',
      'entregado': 'bg-primary', // 🔥 COLOR DIFERENTE PARA ENTREGADO
      'pagado': 'bg-info',
      'cancelado': 'bg-danger'
    };
    return clases[estado] || 'bg-secondary';
  }

  // 🔄 Cambiar estado del pedido
  window.cambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
    if (!confirm(`¿Cambiar estado del pedido a "${obtenerTextoEstado(nuevoEstado)}"?`)) return;

    try {
      const res = await fetch(`${apiURL}/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: nuevoEstado })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensaje || 'Error al cambiar estado');
      }

      alert('✅ Estado actualizado correctamente');
      await cargarPedidos();
      await cargarMesasParaPedido();

    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert('❌ Error: ' + err.message);
    }
  };

  // 👁️ Ver detalles del pedido
  window.verDetallesPedido = async (pedidoId) => {
    try {
      const res = await fetch(`${apiURL}/${pedidoId}`, { credentials: 'include' });
      const pedido = await res.json();
      
      if (!res.ok) {
        throw new Error(pedido.mensaje || 'Error al cargar detalles');
      }

      // Mostrar detalles en un modal simple
      const detalles = `
        <strong>Pedido #${pedido._id.substring(18)}</strong><br>
        <strong>Mesa:</strong> ${pedido.mesa?.numero || 'N/A'} (Piso ${pedido.mesa?.piso || 'N/A'})<br>
        <strong>Estado:</strong> ${obtenerTextoEstado(pedido.estado)}<br>
        <strong>Total:</strong> S/ ${pedido.total?.toFixed(2) || '0.00'}<br>
        <strong>Productos:</strong><br>
        ${Array.isArray(pedido.items) ? pedido.items.map(item => 
          `- ${item.producto?.nombre || 'Producto'} x${item.cantidad} (S/ ${item.precioUnitario?.toFixed(2) || '0.00'})`
        ).join('<br>') : 'Sin productos'}
      `;
      
      alert(detalles);

    } catch (err) {
      console.error('Error cargando detalles:', err);
      alert('❌ Error al cargar detalles del pedido');
    }
  };

    // 🔥 NUEVA FUNCIÓN: Verificar si un pedido puede ser editado (5 minutos límite)
  function puedeEditarPedido(fechaCreacion) {
    const fechaPedido = new Date(fechaCreacion);
    const ahora = new Date();
    const diferenciaMinutos = (ahora - fechaPedido) / (1000 * 60); // Diferencia en minutos
    
    return diferenciaMinutos <= 5; // 5 minutos límite
  }

  // 🔥 NUEVA FUNCIÓN: Formatear tiempo restante para edición
  function obtenerTiempoRestante(fechaCreacion) {
    const fechaPedido = new Date(fechaCreacion);
    const ahora = new Date();
    const diferenciaMinutos = (ahora - fechaPedido) / (1000 * 60);
    const minutosRestantes = Math.max(0, 5 - Math.floor(diferenciaMinutos));
    
    return minutosRestantes;
  }

  // 🔥 NUEVA FUNCIÓN: Editar pedido
  window.editarPedido = async (pedidoId) => {
    try {
      const res = await fetch(`${apiURL}/${pedidoId}`, { credentials: 'include' });
      const pedido = await res.json();
      
      if (!res.ok) {
        throw new Error(pedido.mensaje || 'Error al cargar pedido');
      }

      // Verificar si puede editar (5 minutos límite)
      if (!puedeEditarPedido(pedido.fechaCreacion)) {
        const minutosTranscurridos = Math.floor((new Date() - new Date(pedido.fechaCreacion)) / (1000 * 60));
        alert(`❌ No puedes editar este pedido. Han pasado ${minutosTranscurridos} minutos (límite: 5 minutos)`);
        return;
      }

      // Cargar datos del pedido en el formulario de edición
      cargarPedidoParaEdicion(pedido);
      
    } catch (err) {
      console.error('Error editando pedido:', err);
      alert('❌ Error al cargar pedido para editar');
    }
  };

  // 🔥 NUEVA FUNCIÓN: Cargar datos del pedido en formulario de edición
  function cargarPedidoParaEdicion(pedido) {
    // Crear modal de edición
    const modalHtml = `
      <div class="modal-backdrop show"></div>
      <div class="modal show d-block" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content bg-dark text-light">
            <div class="modal-header">
              <h5 class="modal-title">
                ✏️ Editar Pedido #${pedido._id.substring(18)}
                <small class="text-warning ms-2">
                  ⏰ Tiempo restante: ${obtenerTiempoRestante(pedido.fechaCreacion)} minutos
                </small>
              </h5>
              <button type="button" class="btn-close btn-close-white" onclick="cerrarModalEdicion()"></button>
            </div>
            <div class="modal-body">
              <form id="formEditarPedido">
                <div class="mb-3">
                  <label class="form-label">Observaciones Generales</label>
                  <textarea class="form-control campo-oscuro" id="editarObservaciones" rows="3">${pedido.observacionesGenerales || ''}</textarea>
                </div>
                
                <h6>Productos del Pedido</h6>
                <div id="listaEdicionProductos">
                  ${Array.isArray(pedido.items) ? pedido.items.map((item, index) => `
                    <div class="card mb-2 bg-secondary" data-index="${index}">
                      <div class="card-body py-2">
                        <div class="row align-items-center">
                          <div class="col-md-4">
                            <strong>${item.producto?.nombre || 'Producto'}</strong>
                          </div>
                          <div class="col-md-3">
                            <label class="form-label small">Cantidad:</label>
                            <input type="number" class="form-control form-control-sm campo-oscuro" 
                                  value="${item.cantidad}" min="1" 
                                  onchange="actualizarSubtotal(${index})">
                          </div>
                          <div class="col-md-3">
                            <label class="form-label small">Precio:</label>
                            <input type="number" class="form-control form-control-sm campo-oscuro" 
                                  value="${item.precioUnitario}" step="0.01" min="0" readonly>
                          </div>
                          <div class="col-md-2">
                            <button type="button" class="btn btn-sm btn-danger" onclick="eliminarProductoEdicion(${index})">
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div class="mt-1">
                          <input type="text" class="form-control form-control-sm campo-oscuro" 
                                placeholder="Observaciones..." value="${item.observaciones || ''}">
                        </div>
                      </div>
                    </div>
                  `).join('') : 'Sin productos'}
                </div>
                
                <div class="mt-3">
                  <strong>Total: S/ <span id="totalEdicion">${pedido.total?.toFixed(2) || '0.00'}</span></strong>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="cerrarModalEdicion()">Cancelar</button>
              <button type="button" class="btn btn-primary" onclick="guardarEdicionPedido('${pedido._id}')">
                💾 Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modalEdicionPedido';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  }

  // 🔥 NUEVA FUNCIÓN: Cerrar modal de edición
  window.cerrarModalEdicion = function() {
    const modalContainer = document.getElementById('modalEdicionPedido');
    if (modalContainer) {
      modalContainer.remove();
    }
  };

  // 🔥 NUEVA FUNCIÓN: Guardar edición del pedido
  window.guardarEdicionPedido = async function(pedidoId) {
    try {
      // Recopilar datos del formulario
      const observacionesGenerales = document.getElementById('editarObservaciones').value;
      const items = [];
      let total = 0;

      // Recorrer todos los productos en el modal
      document.querySelectorAll('#listaEdicionProductos .card').forEach(card => {
        const index = card.dataset.index;
        const cantidad = parseInt(card.querySelector('input[type="number"]').value) || 1;
        const precio = parseFloat(card.querySelector('input[readonly]').value) || 0;
        const observaciones = card.querySelector('input[type="text"]').value || '';
        
        items.push({
          productoId: pedidoActual.items[index].producto._id, // Asumiendo que tienes el pedido actual
          cantidad: cantidad,
          observaciones: observaciones
        });
        
        total += cantidad * precio;
      });

      const datosActualizados = {
        observacionesGenerales: observacionesGenerales,
        items: items,
        total: total
      };

      const res = await fetch(`${apiURL}/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(datosActualizados)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensaje || 'Error al actualizar pedido');
      }

      alert('✅ Pedido actualizado correctamente');
      cerrarModalEdicion();
      await cargarPedidos();

    } catch (err) {
      console.error('Error guardando edición:', err);
      alert('❌ Error al guardar cambios: ' + err.message);
    }
  };

  // 📝 Obtener texto del estado
  function obtenerTextoEstado(estado) {
    const estados = {
      'creado': '🆕 Creado',
      'en_cocina': '👨‍🍳 En Cocina',
      'listo': '✅ Listo',
      'entregado': '📦 Entregado', // 🔥 TEXTO ACTUALIZADO
      'pagado': '💳 Pagado',
      'cancelado': '❌ Cancelado'
    };
    return estados[estado] || estado;
  }

  // 🔄 Event listeners
  if (btnActualizar) {
    btnActualizar.addEventListener('click', cargarPedidos);
  }

  if (filtroEstado) {
    filtroEstado.addEventListener('change', cargarPedidos);
  }

  // Cargar pedidos cada 30 segundos
  setInterval(cargarPedidos, 30000);
}