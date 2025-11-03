function initModuloCocina() {
    console.log("👨‍🍳 Módulo Cocina iniciado.");
    
    // Referencias
    const tarjetasContainer = document.getElementById('tarjetasPedidosContainer');
    const filtroEstado = document.getElementById('filtroEstadoCocina');
    const btnActualizar = document.getElementById('btnActualizarCocina');
    const modalDetalles = document.getElementById('modalDetallesPedido');
    
    // Contadores
    const contadorCreados = document.getElementById('contadorCreados');
    const contadorEnCocina = document.getElementById('contadorEnCocina');
    const contadorListos = document.getElementById('contadorListos');
    const contadorTotal = document.getElementById('contadorTotal');
    
    const apiURL = "http://localhost:4000/api/pedidos";
    let pedidos = [];
    let intervaloActualizacion = null;

    // Funciones para manejar modales manualmente
    function mostrarModal(modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
    }

    function ocultarModal(modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }

    // Cargar pedidos iniciales
    cargarPedidos();

    // Hacer función global para actualizaciones
    window.actualizarVistaCocina = function(nuevosPedidos) {
        console.log("🔄 Actualizando vista de cocina");
        if (Array.isArray(nuevosPedidos)) {
            pedidos = nuevosPedidos;
            renderizarTarjetas();
            actualizarContadores();
        }
    };

    async function cargarPedidos() {
        try {
            let url = apiURL;
            if (filtroEstado && filtroEstado.value !== 'todos') {
                url += `?estado=${filtroEstado.value}`;
            }
            
            console.log("📡 Cargando pedidos desde:", url);
            
            const res = await fetch(url, { 
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('No tienes permisos para ver los pedidos');
                }
                throw new Error(`Error ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Formato de datos inválido');
            }
            
            console.log(`✅ Pedidos cargados: ${data.length} pedidos`);
            pedidos = data;
            renderizarTarjetas();
            actualizarContadores();
            
            // Iniciar actualizaciones automáticas
            if (!intervaloActualizacion) {
                iniciarActualizacionesAutomaticas();
            }
            
        } catch (error) {
            console.error("Error cargando pedidos:", error);
            mostrarError(error.message || "No se pudieron cargar los pedidos. Intenta recargar la página.");
        }
    }

    function renderizarTarjetas() {
        if (!tarjetasContainer) return;
        
        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            tarjetasContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-warning">
                        <i class="fas fa-inbox fa-2x mb-3"></i>
                        <h5>No hay pedidos</h5>
                        <p class="mb-0">No se encontraron pedidos con los filtros seleccionados.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Filtrar pedidos que el cocinero puede ver (solo estados de cocina)
        const pedidosCocina = pedidos.filter(pedido => 
            ['creado', 'en_cocina', 'listo'].includes(pedido.estado)
        );

        console.log(`🍽️ Pedidos en cocina: ${pedidosCocina.length} de ${pedidos.length} totales`);

        if (pedidosCocina.length === 0) {
            tarjetasContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-utensils fa-2x mb-3"></i>
                        <h5>No hay pedidos en cocina</h5>
                        <p class="mb-0">Todos los pedidos están fuera del área de cocina.</p>
                    </div>
                </div>
            `;
            return;
        }

        tarjetasContainer.innerHTML = pedidosCocina.map(pedido => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card tarjeta-pedido tarjeta-estado-${pedido.estado} h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span class="badge bg-${obtenerColorEstado(pedido.estado)}">
                            ${obtenerTextoEstado(pedido.estado)}
                        </span>
                        <small class="text-muted">#${pedido._id ? pedido._id.substring(18) : 'N/A'}</small>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-table"></i> Mesa ${pedido.mesa?.numero || 'N/A'}
                            <small class="text-muted d-block">Piso ${pedido.mesa?.piso || 'N/A'}</small>
                        </h6>
                        
                        <div class="mb-2">
                            <small class="text-muted">
                                <i class="fas fa-user"></i> ${pedido.mozo?.nombre || 'N/A'}
                            </small>
                        </div>
                        
                        <div class="mb-3">
                            <small class="text-muted">
                                <i class="fas fa-clock"></i> ${pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleString('es-PE') : 'N/A'}
                            </small>
                        </div>
                        
                        <div class="productos-lista">
                            <strong><i class="fas fa-utensils"></i> Productos:</strong>
                            ${Array.isArray(pedido.items) ? pedido.items.slice(0, 3).map(item => `
                                <div class="producto-item">
                                    <span>${item.producto?.nombre || 'Producto'}</span>
                                    <span class="text-cantidad">x${item.cantidad || 0}</span>
                                </div>
                            `).join('') : 'Sin productos'}
                            ${Array.isArray(pedido.items) && pedido.items.length > 3 ? `
                                <div class="text-muted">
                                    <small>+${pedido.items.length - 3} productos más...</small>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${pedido.observacionesGenerales ? `
                            <div class="mt-2">
                                <small class="text-warning">
                                    <i class="fas fa-sticky-note"></i> Con observaciones
                                </small>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-info w-100" 
                                onclick="mostrarDetallesPedido('${pedido._id}')">
                            <i class="fas fa-eye"></i> Ver Detalles
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Mostrar detalles del pedido en modal
    window.mostrarDetallesPedido = async (pedidoId) => {
        try {
            const pedido = pedidos.find(p => p._id === pedidoId);
            if (!pedido) {
                alert('Pedido no encontrado');
                return;
            }

            console.log("📋 Mostrando detalles del pedido:", pedidoId);

            // Llenar información básica
            document.getElementById('detalleMesa').textContent = `Mesa ${pedido.mesa?.numero || 'N/A'} (Piso ${pedido.mesa?.piso || 'N/A'})`;
            document.getElementById('detalleMozo').textContent = pedido.mozo?.nombre || 'N/A';
            document.getElementById('detalleFecha').textContent = pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleString('es-PE') : 'N/A';
            
            // Estado actual
            const detalleEstado = document.getElementById('detalleEstado');
            detalleEstado.textContent = obtenerTextoEstado(pedido.estado);
            detalleEstado.className = `badge bg-${obtenerColorEstado(pedido.estado)} fs-6`;

            // Observaciones generales
            const observacionesContainer = document.getElementById('observacionesContainer');
            const detalleObservaciones = document.getElementById('detalleObservaciones');
            if (pedido.observacionesGenerales) {
                observacionesContainer.style.display = 'block';
                detalleObservaciones.textContent = pedido.observacionesGenerales;
            } else {
                observacionesContainer.style.display = 'none';
            }

            // Productos
            const detalleProductosBody = document.getElementById('detalleProductosBody');
            if (Array.isArray(pedido.items)) {
                detalleProductosBody.innerHTML = pedido.items.map(item => `
                    <tr>
                        <td>${item.producto?.nombre || 'Producto'}</td>
                        <td class="text-cantidad">${item.cantidad || 0}</td>
                        <td>${item.observaciones || '-'}</td>
                        <td>
                            <span class="badge bg-${item.estado === 'listo' ? 'success' : 'secondary'}">
                                ${item.estado === 'listo' ? '✅ Listo' : '⏳ Pendiente'}
                            </span>
                        </td>
                    </tr>
                `).join('');
            } else {
                detalleProductosBody.innerHTML = '<tr><td colspan="4" class="text-center">No hay productos</td></tr>';
            }

            // Botones para cambiar estado
            const cambiarEstadoContainer = document.getElementById('cambiarEstadoContainer');
            cambiarEstadoContainer.innerHTML = generarBotonesEstado(pedido);

            // Mostrar modal
            mostrarModal(modalDetalles);

        } catch (error) {
            console.error('Error mostrando detalles:', error);
            alert('Error al cargar los detalles del pedido');
        }
    };

    // Generar botones de estado según el estado actual
    function generarBotonesEstado(pedido) {
        const estadosSiguientes = {
            'creado': ['en_cocina'],
            'en_cocina': ['listo'],
            'listo': [] // No hay siguiente estado desde "listo"
        };

        const estados = estadosSiguientes[pedido.estado] || [];
        
        if (estados.length === 0) {
            return '<div class="alert alert-success"><i class="fas fa-check"></i> Pedido completado en cocina</div>';
        }

        return estados.map(estado => `
            <button class="btn btn-${obtenerColorBotonEstado(estado)} w-100 mb-2" 
                    onclick="cambiarEstadoPedido('${pedido._id}', '${estado}')">
                <i class="fas ${obtenerIconoEstado(estado)}"></i>
                ${obtenerTextoBotonEstado(estado)}
            </button>
        `).join('');
    }

    // Cambiar estado del pedido
    window.cambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
        if (!confirm(`¿Cambiar estado del pedido a "${obtenerTextoEstado(nuevoEstado)}"?`)) return;

        try {
            console.log(`🔄 Cambiando estado del pedido ${pedidoId} a ${nuevoEstado}`);

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
            ocultarModal(modalDetalles);
            await cargarPedidos(); // Recargar para ver cambios

        } catch (err) {
            console.error('Error cambiando estado:', err);
            alert('❌ Error: ' + err.message);
        }
    };

    // Actualizar contadores
    function actualizarContadores() {
        if (!Array.isArray(pedidos)) return;
        
        const creados = pedidos.filter(p => p.estado === 'creado').length;
        const enCocina = pedidos.filter(p => p.estado === 'en_cocina').length;
        const listos = pedidos.filter(p => p.estado === 'listo').length;
        const total = pedidos.length;
        
        console.log(`📊 Contadores: Creados=${creados}, EnCocina=${enCocina}, Listos=${listos}, Total=${total}`);
        
        if (contadorCreados) contadorCreados.textContent = creados;
        if (contadorEnCocina) contadorEnCocina.textContent = enCocina;
        if (contadorListos) contadorListos.textContent = listos;
        if (contadorTotal) contadorTotal.textContent = total;

        // Actualizar badge en sidebar
        const badgeCocina = document.getElementById('badge-cocina');
        if (badgeCocina) {
            const totalPendientes = creados + enCocina;
            badgeCocina.textContent = totalPendientes;
            badgeCocina.className = `badge ${totalPendientes > 0 ? 'bg-warning' : 'bg-secondary'} ms-1`;
        }
    }

    // Funciones auxiliares
    function obtenerColorEstado(estado) {
        const colores = {
            'creado': 'warning',
            'en_cocina': 'info', 
            'listo': 'success',
            'entregado': 'primary',
            'pagado': 'secondary',
            'cancelado': 'danger'
        };
        return colores[estado] || 'secondary';
    }

    function obtenerTextoEstado(estado) {
        const estados = {
            'creado': '🆕 Creado',
            'en_cocina': '👨‍🍳 En Cocina',
            'listo': '✅ Listo',
            'entregado': '📦 Entregado',
            'pagado': '💳 Pagado',
            'cancelado': '❌ Cancelado'
        };
        return estados[estado] || estado;
    }

    function obtenerColorBotonEstado(estado) {
        const colores = {
            'en_cocina': 'warning',
            'listo': 'success'
        };
        return colores[estado] || 'primary';
    }

    function obtenerTextoBotonEstado(estado) {
        const textos = {
            'en_cocina': 'Comenzar Preparación',
            'listo': 'Marcar como Listo'
        };
        return textos[estado] || estado;
    }

    function obtenerIconoEstado(estado) {
        const iconos = {
            'en_cocina': 'fa-play',
            'listo': 'fa-check'
        };
        return iconos[estado] || 'fa-utensils';
    }

    function mostrarError(mensaje) {
        if (tarjetasContainer) {
            tarjetasContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h5>Error</h5>
                        <p class="mb-0">${mensaje}</p>
                    </div>
                </div>
            `;
        }
    }

    // Actualizaciones automáticas cada 30 segundos
    function iniciarActualizacionesAutomaticas() {
        intervaloActualizacion = setInterval(() => {
            console.log("🔄 Actualización automática de cocina");
            cargarPedidos();
        }, 30000);
    }

    // Event listeners
    if (filtroEstado) {
        filtroEstado.addEventListener('change', cargarPedidos);
    }

    if (btnActualizar) {
        btnActualizar.addEventListener('click', cargarPedidos);
    }

    // Cerrar modales
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            ocultarModal(modal);
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                ocultarModal(this);
            }
        });
    });

    // Limpiar intervalo cuando se cambie de módulo
    window.cleanupCocina = function() {
        if (intervaloActualizacion) {
            clearInterval(intervaloActualizacion);
            intervaloActualizacion = null;
            console.log("🧹 Limpiando actualizaciones automáticas de cocina");
        }
    };
}