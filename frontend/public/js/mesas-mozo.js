function initModuloMesas() {
    console.log("🪑 Módulo Mesas (Mozo) - Solo lectura");
    
    // Referencias
    const mapaContainer = document.getElementById('mapaMesasContainer');
    const mesasMapa = document.getElementById('mesasMapa');
    const imagenPiso = document.getElementById('imagenPiso');
    const selectPiso = document.getElementById('selectPiso');
    
    let mesas = [];
    let pisoActual = 1;
    let intervaloActualizacion = null;

    // Cargar mesas iniciales
    cargarMesas();

    // Hacer función global para actualizaciones desde dashboard.js
    window.actualizarVistaMesasMozo = function(nuevasMesas) {
        console.log("Actualizando vista de mesas para Mozo");
        if (Array.isArray(nuevasMesas)) {
            mesas = nuevasMesas;
            renderizarMesas();
        } else {
            console.error("Datos de mesas no son un array:", nuevasMesas);
        }
    };

    async function cargarMesas() {
        try {
            const res = await fetch('/api/mesas', { 
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('No tienes permisos para ver las mesas');
                } else {
                    throw new Error(`Error ${res.status}: ${res.statusText}`);
                }
            }
            
            const data = await res.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Formato de datos inválido');
            }
            
            mesas = data;
            renderizarMesas();
            
            // Iniciar actualizaciones automáticas solo si no están activas
            if (!intervaloActualizacion) {
                iniciarActualizacionesAutomaticas();
            }
            
        } catch (error) {
            console.error("Error cargando mesas:", error);
            mostrarError(error.message || "No se pudieron cargar las mesas.");
        }
    }

    function renderizarMesas() {
        if (!mesasMapa) return;
        
        // Verificar que mesas sea un array
        if (!Array.isArray(mesas)) {
            console.error("mesas no es un array:", mesas);
            mostrarError("Error: Datos de mesas inválidos");
            return;
        }
        
        const mesasDelPiso = mesas.filter(m => m.piso === pisoActual);
        
        mesasMapa.innerHTML = '';
        
        if (mesasDelPiso.length === 0) {
            mesasMapa.innerHTML = `
                <div class="alert alert-warning position-absolute top-50 start-50 translate-middle text-center">
                    <i class="fas fa-info-circle"></i><br>
                    No hay mesas en el piso ${pisoActual}
                </div>
            `;
            return;
        }
        
        mesasDelPiso.forEach(mesa => {
            // Solo crear elementos en el mapa si tienen coordenadas definidas
            if (mesa.posX === 0 && mesa.posY === 0) return;
            
            const mesaDiv = document.createElement('div');
            mesaDiv.classList.add('mesa-circulo');
            mesaDiv.style.left = mesa.posX + '%';
            mesaDiv.style.top = mesa.posY + '%';
            mesaDiv.dataset.id = mesa._id;
            mesaDiv.dataset.numero = mesa.numero;

            // USAR LOS MISMOS COLORES Y ESTILOS DEL ADMIN
            const colores = {
                "Libre": "#00cc88",
                "Ocupada": "#ff4444",
                "Reservada": "#ffaa00",
                "Pendiente de pago": "#0099ff",
                "Cerrada": "#999999"
            };
            mesaDiv.style.backgroundColor = colores[mesa.estado] || "#cccccc";
            mesaDiv.title = `Mesa ${mesa.numero} (${mesa.estado}) - Capacidad: ${mesa.capacidad}`;

            // SOLO LECTURA - No abrir editor al hacer doble click
            mesaDiv.addEventListener('click', () => {
                mostrarInfoMesa(mesa);
            });
            
            mesasMapa.appendChild(mesaDiv);
        });
    }

    // Función para mostrar información de la mesa (solo lectura)
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
                    ${mesa.ubicacion ? `<br>Ubicación: ${mesa.ubicacion}` : ''}
                </div>
                <button type="button" class="btn-close btn-close-white ms-2" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alert.parentElement) alert.remove();
        }, 5000);
    }

    function mostrarError(mensaje) {
        if (mesasMapa) {
            mesasMapa.innerHTML = `
                <div class="alert alert-danger position-absolute top-50 start-50 translate-middle text-center">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    ${mensaje}<br>
                    <small class="text-muted">Recarga la página o contacta al administrador</small>
                </div>
            `;
        }
    }

    // Actualizaciones automáticas cada 30 segundos
    function iniciarActualizacionesAutomaticas() {
        intervaloActualizacion = setInterval(() => {
            console.log("Actualización automática de mesas (Mozo)");
            cargarMesas();
        }, 30000);
    }

    // Cambiar de piso
    if (selectPiso) {
        selectPiso.addEventListener('change', e => {
            pisoActual = parseInt(e.target.value);
            if (imagenPiso) {
                imagenPiso.src = `../public/img/piso${pisoActual}.png`;
            }
            renderizarMesas();
        });
    }

    // Limpiar intervalo cuando se cambie de módulo
    window.cleanupMesasMozo = function() {
        if (intervaloActualizacion) {
            clearInterval(intervaloActualizacion);
            intervaloActualizacion = null;
            console.log("🧹 Limpiando actualizaciones automáticas de mesas");
        }
    };
}