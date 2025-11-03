function initModuloReservasMozo() {
    console.log("📅 Módulo Reservas (Mozo) - Solo lectura");

    // Referencias
    const tablaBody = document.getElementById('tablaReservasBody');
    const mapaContainer = document.getElementById('mesasMapaReservas');
    const filtroEstado = document.getElementById('filtroEstadoReserva');
    const filtroFecha = document.getElementById('fechaReserva');
    const btnActualizar = document.getElementById('btnActualizarReservas');

    const apiReservas = "http://localhost:4000/api/reservas";
    const apiMesas = "http://localhost:4000/api/mesas";
    
    let reservas = [];
    let mesas = [];
    let pisoActual = 1;
    let intervaloReservas = null;

    // 🔥 FUNCIÓN PARA ACTUALIZACIÓN DESDE DASHBOARD
    window.actualizarVistaReservasMozo = function(nuevasReservas) {
        console.log("🔄 Actualizando vista de reservas para Mozo");
        if (Array.isArray(nuevasReservas)) {
            reservas = nuevasReservas;
            renderizarMapa();
            renderizarTabla();
        } else {
            console.error("❌ Datos de reservas no son un array:", nuevasReservas);
        }
    };

    // Cargar datos iniciales
    cargarDatos();

    async function cargarDatos() {
        try {
            console.log("📡 Cargando datos de reservas y mesas...");
            await Promise.all([
                cargarReservas(),
                cargarMesas()
            ]);
            console.log(`✅ Datos cargados: ${reservas.length} reservas, ${mesas.length} mesas`);
            renderizarMapa();
            renderizarTabla();
        } catch (error) {
            console.error("Error cargando datos:", error);
            mostrarError("No se pudieron cargar los datos");
        }
    }

    async function cargarReservas() {
        try {
            const res = await fetch(apiReservas, { credentials: 'include' });
            if (!res.ok) throw new Error('Error al cargar reservas');
            const data = await res.json();
            
            // 🔥 VERIFICAR QUE SEA UN ARRAY
            if (!Array.isArray(data)) {
                console.error("❌ Respuesta de reservas no es un array:", data);
                reservas = [];
            } else {
                reservas = data;
            }
        } catch (error) {
            console.error("Error cargando reservas:", error);
            reservas = [];
            throw error;
        }
    }

    async function cargarMesas() {
        try {
            const res = await fetch(apiMesas, { credentials: 'include' });
            if (!res.ok) throw new Error('Error al cargar mesas');
            const data = await res.json();
            
            // 🔥 VERIFICAR QUE SEA UN ARRAY
            if (!Array.isArray(data)) {
                console.error("❌ Respuesta de mesas no es un array:", data);
                mesas = [];
            } else {
                mesas = data;
            }
        } catch (error) {
            console.error("Error cargando mesas:", error);
            mesas = [];
            throw error;
        }
    }

    function renderizarMapa() {
        if (!mapaContainer) {
            console.error("❌ mapaContainer no encontrado");
            return;
        }

        const mesasDelPiso = mesas.filter(m => m.piso === pisoActual);
        console.log(`🗺️ Renderizando mapa: ${mesasDelPiso.length} mesas en piso ${pisoActual}`);
        
        mapaContainer.innerHTML = '';
        
        if (mesasDelPiso.length === 0) {
            mapaContainer.innerHTML = `
                <div class="alert alert-warning position-absolute top-50 start-50 translate-middle text-center">
                    <i class="fas fa-info-circle"></i><br>
                    No hay mesas en el piso ${pisoActual}
                </div>
            `;
            return;
        }

        mesasDelPiso.forEach(mesa => {
            // 🔥 SOLUCIONADO: Crear elementos incluso si no tienen coordenadas
            const mesaDiv = document.createElement('div');
            mesaDiv.classList.add('mesa-circulo');
            
            // Usar coordenadas si existen, sino posición por defecto
            const posX = mesa.posX && mesa.posX !== 0 ? mesa.posX : 10 + (Math.random() * 80);
            const posY = mesa.posY && mesa.posY !== 0 ? mesa.posY : 10 + (Math.random() * 80);
            
            mesaDiv.style.left = posX + '%';
            mesaDiv.style.top = posY + '%';
            mesaDiv.dataset.id = mesa._id;
            mesaDiv.dataset.numero = mesa.numero;

            // Determinar color según estado y reservas
            const reservaMesa = reservas.find(r => 
                r.mesa && r.mesa._id === mesa._id && 
                ['Reservada', 'Ocupada'].includes(r.estado)
            );

            const colores = {
                "Libre": "#00cc88",
                "Ocupada": "#ff4444",
                "Reservada": "#ffaa00",
                "Pendiente de pago": "#0099ff",
                "Cerrada": "#999999"
            };

            const estadoVisual = reservaMesa ? reservaMesa.estado : mesa.estado;
            mesaDiv.style.backgroundColor = colores[estadoVisual] || "#cccccc";
            
            let tooltip = `Mesa ${mesa.numero} (${estadoVisual}) - Cap: ${mesa.capacidad}`;
            if (reservaMesa) {
                tooltip += `\nCliente: ${reservaMesa.cliente?.nombres || 'N/A'}`;
                tooltip += `\nHora: ${reservaMesa.horaInicio} - ${reservaMesa.horaFin}`;
            }
            mesaDiv.title = tooltip;

            // SOLO LECTURA - Mostrar información al hacer click
            mesaDiv.addEventListener('click', () => {
                if (reservaMesa) {
                    mostrarDetallesReserva(reservaMesa);
                } else {
                    mostrarInfoMesa(mesa);
                }
            });
            
            // Agregar número de mesa
            const numeroTexto = document.createElement('span');
            numeroTexto.textContent = mesa.numero;
            numeroTexto.style.color = 'white';
            numeroTexto.style.fontWeight = 'bold';
            numeroTexto.style.position = 'absolute';
            numeroTexto.style.top = '50%';
            numeroTexto.style.left = '50%';
            numeroTexto.style.transform = 'translate(-50%, -50%)';
            mesaDiv.appendChild(numeroTexto);
            
            mapaContainer.appendChild(mesaDiv);
        });
    }

    function renderizarTabla() {
        if (!tablaBody) {
            console.error("❌ tablaBody no encontrado");
            return;
        }

        let reservasFiltradas = [...reservas];
        console.log(`📋 Renderizando tabla: ${reservasFiltradas.length} reservas`);

        // Aplicar filtros
        if (filtroEstado && filtroEstado.value !== 'todos') {
            reservasFiltradas = reservasFiltradas.filter(r => r.estado === filtroEstado.value);
        }

        if (filtroFecha && filtroFecha.value) {
            reservasFiltradas = reservasFiltradas.filter(r => r.fecha === filtroFecha.value);
        }

        if (reservasFiltradas.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay reservas con los filtros seleccionados</td></tr>';
            return;
        }

        tablaBody.innerHTML = reservasFiltradas.map(reserva => `
            <tr>
                <td>
                    <strong>${reserva.cliente?.nombres || 'N/A'} ${reserva.cliente?.apellidos || ''}</strong>
                    <br><small class="text-muted">DNI: ${reserva.cliente?.dni || 'N/A'}</small>
                </td>
                <td>${reserva.fecha}</td>
                <td>${reserva.horaInicio} - ${reserva.horaFin}</td>
                <td>
                    <span class="badge bg-info">Mesa ${reserva.mesa?.numero || 'N/A'}</span>
                    <small class="text-muted d-block">Piso ${reserva.mesa?.piso || 'N/A'}</small>
                </td>
                <td>
                    <span class="badge bg-${obtenerColorEstado(reserva.estado)}">
                        ${reserva.estado}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="mostrarDetallesReservaMozo('${reserva._id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function obtenerColorEstado(estado) {
        const colores = {
            'Reservada': 'warning',
            'Ocupada': 'success',
            'Completada': 'info',
            'Cancelada': 'danger'
        };
        return colores[estado] || 'secondary';
    }

    // Mostrar información de mesa (sin reserva)
    function mostrarInfoMesa(mesa) {
        const existingAlert = document.getElementById('alert-info-mesa');
        if (existingAlert) existingAlert.remove();
        
        const alert = document.createElement('div');
        alert.id = 'alert-info-mesa';
        alert.className = 'alert alert-info position-fixed top-0 start-50 translate-middle-x mt-3';
        alert.style.zIndex = '9999';
        alert.style.maxWidth = '300px';
        alert.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>Mesa ${mesa.numero}</strong><br>
                    Estado: <span class="badge bg-${mesa.estado === 'Libre' ? 'success' : mesa.estado === 'Ocupada' ? 'danger' : 'warning'}">${mesa.estado}</span><br>
                    Capacidad: ${mesa.capacidad} personas<br>
                    Piso: ${mesa.piso}
                </div>
                <button type="button" class="btn-close btn-close-white ms-2" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentElement) alert.remove();
        }, 5000);
    }

    // 🔥 CORREGIDO: Mostrar detalles de reserva SIN Bootstrap
    window.mostrarDetallesReserva = function(reserva) {
        // Crear modal manualmente
        const modalHtml = `
            <div class="modal-backdrop show"></div>
            <div class="modal show d-block" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="fas fa-info-circle"></i> Detalles de la Reserva</h5>
                            <button type="button" class="btn-close btn-close-white" onclick="cerrarModalReserva()"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6><i class="fas fa-user"></i> Información del Cliente</h6>
                                    <p><strong>Nombre:</strong> ${reserva.cliente?.nombres || 'N/A'} ${reserva.cliente?.apellidos || ''}</p>
                                    <p><strong>DNI:</strong> ${reserva.cliente?.dni || 'N/A'}</p>
                                    <p><strong>Teléfono:</strong> ${reserva.cliente?.telefono || 'N/A'}</p>
                                    <p><strong>Correo:</strong> ${reserva.cliente?.correo || 'N/A'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6><i class="fas fa-calendar"></i> Información de la Reserva</h6>
                                    <p><strong>Fecha:</strong> ${reserva.fecha}</p>
                                    <p><strong>Hora:</strong> ${reserva.horaInicio} - ${reserva.horaFin}</p>
                                    <p><strong>Mesa:</strong> Mesa ${reserva.mesa?.numero || 'N/A'} (Piso ${reserva.mesa?.piso || 'N/A'})</p>
                                    <p><strong>Estado:</strong> <span class="badge bg-${obtenerColorEstado(reserva.estado)}">${reserva.estado}</span></p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="cerrarModalReserva()">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modalReservaManual';
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
    };

    // Función para cerrar el modal manual
    window.cerrarModalReserva = function() {
        const modalContainer = document.getElementById('modalReservaManual');
        if (modalContainer) {
            modalContainer.remove();
        }
    };

    // Función global para buscar reserva por ID
    window.mostrarDetallesReservaMozo = async function(reservaId) {
        try {
            const reserva = reservas.find(r => r._id === reservaId);
            if (reserva) {
                mostrarDetallesReserva(reserva);
            } else {
                alert('Reserva no encontrada');
            }
        } catch (error) {
            console.error('Error mostrando detalles:', error);
            alert('Error al cargar los detalles de la reserva');
        }
    };

    function mostrarError(mensaje) {
        console.error("❌ Error:", mensaje);
        if (tablaBody) {
            tablaBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${mensaje}</td></tr>`;
        }
        if (mapaContainer) {
            mapaContainer.innerHTML = `
                <div class="alert alert-danger position-absolute top-50 start-50 translate-middle text-center">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    ${mensaje}
                </div>
            `;
        }
    }

    // Event listeners
    if (filtroEstado) {
        filtroEstado.addEventListener('change', renderizarTabla);
    }

    if (filtroFecha) {
        filtroFecha.addEventListener('change', renderizarTabla);
    }

    if (btnActualizar) {
        btnActualizar.addEventListener('click', cargarDatos);
    }

    // 🔥 ACTUALIZADO: Solo una actualización automática
    intervaloReservas = setInterval(cargarDatos, 60000);
    
    console.log("✅ Módulo Reservas Mozo iniciado correctamente");
}

// Limpiar recursos
window.cleanupReservasMozo = function() {
    console.log("🧹 Limpiando recursos del módulo reservas (mozo)");
    if (intervaloReservas) {
        clearInterval(intervaloReservas);
        intervaloReservas = null;
    }
    
    // Cerrar modal si está abierto
    window.cerrarModalReserva();
};