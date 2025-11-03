// === MÓDULO RESERVAS ===
function initModuloReservas() {
  console.log("📅 Módulo Reservas iniciado.");

  // === referencias ===
  const form = document.getElementById('formReserva');
  const selectMesa = document.getElementById('mesa');
  const vistaTipo = document.getElementById('vistaTipo');
  const vistaMapa = document.getElementById('vistaMapa');
  const vistaTabla = document.getElementById('vistaTabla');
  const contenedorMapa = document.getElementById('mesasMapaReservas');
  const tablaReservasBody = document.getElementById('tablaReservasBody');
  const horaActualEl = document.getElementById('horaActual');
  const selectPiso = document.getElementById('selectPiso');
  const imagenPisoReserva = document.getElementById('imagenPisoReserva');
  const horaSimulada = document.getElementById('horaSimulada');
  const btnActualizarMapa = document.getElementById('btnActualizarMapa');

  // Campos del formulario
  const dniCliente = document.getElementById('dniCliente');
  const nombreCliente = document.getElementById('nombreCliente');
  const apellidoCliente = document.getElementById('apellidoCliente');
  const telefonoCliente = document.getElementById('telefonoCliente');
  const correoCliente = document.getElementById('correoCliente');
  const fechaInput = document.getElementById('fecha');
  const horaInicioInput = document.getElementById('horaInicio');
  const horaFinInput = document.getElementById('horaFin');

  // === rutas del backend ===
  const apiMesas = "http://localhost:4000/api/mesas";
  const apiReservas = "http://localhost:4000/api/reservas";
  const apiClientes = "http://localhost:4000/api/clientes";

  // === Configurar fecha mínima (hoy) ===
  const hoy = new Date().toISOString().split('T')[0];
  fechaInput.min = hoy;
  fechaInput.value = hoy;

  // === Configurar horas por defecto ===
  horaInicioInput.value = "12:00";
  horaFinInput.value = "13:00";

  // === reloj dinámico ===
  function actualizarReloj() {
    const ahora = new Date();
    horaActualEl.textContent = ahora.toLocaleTimeString('es-PE', { hour12: false });
  }
  setInterval(actualizarReloj, 1000);
  actualizarReloj();

  // === cargar mesas por piso ===
  async function cargarMesas(pisoSeleccionado = 1) {
    try {
      const res = await fetch(apiMesas);
      const mesas = await res.json();

      selectMesa.innerHTML = '<option value="">Seleccionar mesa</option>';
      contenedorMapa.innerHTML = '';

      mesas
        .filter(m => m.piso === pisoSeleccionado)
        .forEach(m => {
          // combo
          const option = document.createElement('option');
          option.value = m._id;
          option.textContent = `Mesa ${m.numero} (Piso ${m.piso}) - Cap: ${m.capacidad}`;
          selectMesa.appendChild(option);

          // círculo en el mapa
          const mesaDiv = document.createElement('div');
          mesaDiv.classList.add('mesa-circulo');
          mesaDiv.textContent = m.numero;
          mesaDiv.dataset.id = m._id;

          mesaDiv.style.top = `${m.posY}%`;
          mesaDiv.style.left = `${m.posX}%`;
          mesaDiv.style.transform = 'translate(-50%, -50%)';

          // Color según estado
          if (m.estado === 'Libre') {
            mesaDiv.classList.add('mesa-libre');
          } else if (m.estado === 'Reservada') {
            mesaDiv.classList.add('mesa-reservada');
          } else if (m.estado === 'Ocupada') {
            mesaDiv.classList.add('mesa-ocupada');
          }

          mesaDiv.addEventListener('click', () => {
            selectMesa.value = m._id;
            // Resaltar mesa seleccionada
            document.querySelectorAll('.mesa-circulo').forEach(m => m.classList.remove('mesa-seleccionada'));
            mesaDiv.classList.add('mesa-seleccionada');
          });

          contenedorMapa.appendChild(mesaDiv);
        });

      await actualizarMapaPorHora();
    } catch (error) {
      console.error("❌ Error cargando mesas:", error);
    }
  }


  // === actualizar mapa según hora simulada ===
  async function actualizarMapaPorHora() {
    try {
      const res = await fetch(apiReservas);
      const reservas = await res.json();

      const horaInput = horaSimulada.value || new Date().toLocaleTimeString('es-PE', { hour12: false });
      const ahora = new Date();
      const [h, m] = horaInput.split(':');
      ahora.setHours(parseInt(h), parseInt(m), 0, 0);

      console.log('🕒 Actualizando mapa - Hora:', horaInput);
      console.log('📋 Total reservas:', reservas.length);

      let mesasActualizadas = 0;

      document.querySelectorAll('.mesa-circulo').forEach(mesaDiv => {
        const mesaId = mesaDiv.dataset.id;
        
        // Buscar reservas activas para esta mesa
        const reservasActivas = reservas.filter(r => {
          if (!r.mesa || r.mesa._id !== mesaId) return false;
          
          try {
            const inicio = new Date(`${r.fecha}T${r.horaInicio}`);
            const fin = new Date(`${r.fecha}T${r.horaFin}`);
            const estaActiva = ahora >= inicio && ahora <= fin;
            
            return estaActiva && (r.estado === 'Reservada' || r.estado === 'Ocupada');
          } catch (error) {
            console.error('Error procesando reserva:', error);
            return false;
          }
        });

        // Determinar el nuevo estado
        const tieneReservaActiva = reservasActivas.length > 0;
        const estadoActual = mesaDiv.classList.contains('mesa-reservada') ? 'reservada' : 
                            mesaDiv.classList.contains('mesa-ocupada') ? 'ocupada' : 'libre';
        
        const nuevoEstado = tieneReservaActiva ? 'reservada' : 'libre';

        // Solo actualizar si cambió el estado
        if (estadoActual !== nuevoEstado) {
          mesaDiv.classList.remove('mesa-ocupada', 'mesa-reservada', 'mesa-libre');
          
          if (tieneReservaActiva) {
            mesaDiv.classList.add('mesa-reservada');
            console.log(`🟡 Mesa ${mesaId} actualizada a RESERVADA`);
          } else {
            mesaDiv.classList.add('mesa-libre');
            console.log(`🟢 Mesa ${mesaId} actualizada a LIBRE`);
          }
          
          mesasActualizadas++;
        }
      });

      console.log(`✅ Map actualizado: ${mesasActualizadas} mesas cambiaron de estado`);

    } catch (error) {
      console.error("❌ Error actualizando mapa:", error);
    }
  }
  // === cargar tabla de reservas ===
  async function cargarTablaReservas() {
    try {
      const res = await fetch(apiReservas);
      const reservas = await res.json();

      tablaReservasBody.innerHTML = '';
      if (reservas.length === 0) {
        tablaReservasBody.innerHTML = `<tr><td colspan="6">Sin reservas registradas</td></tr>`;
        return;
      }

      reservas.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.cliente?.nombres || 'Sin nombre'} ${r.cliente?.apellidos || ''}</td>
          <td>${r.fecha}</td>
          <td>${r.horaInicio}</td>
          <td>${r.horaFin}</td>
          <td>Mesa ${r.mesa?.numero || '-'}</td>
          <td>
            <span class="badge ${r.estado === 'Reservada' ? 'bg-warning' : 
                               r.estado === 'Ocupada' ? 'bg-success' : 
                               r.estado === 'Completada' ? 'bg-info' : 'bg-secondary'}">
              ${r.estado || 'Pendiente'}
            </span>
          </td>
        `;
        tablaReservasBody.appendChild(tr);
      });
    } catch (error) {
      console.error("❌ Error cargando tabla:", error);
    }
  }

  // === autocompletar cliente por DNI ===
  dniCliente.addEventListener('blur', async () => {
    const dni = dniCliente.value.trim();
    if (!dni || dni.length !== 8) return;

    try {
      const res = await fetch(`${apiClientes}/${dni}`);
      if (res.ok) {
        const cliente = await res.json();

        // ✅ nombres correctos (coinciden con el modelo)
        nombreCliente.value = cliente.nombres || '';
        apellidoCliente.value = cliente.apellidos || '';
        telefonoCliente.value = cliente.telefono || '';
        correoCliente.value = cliente.correo || '';
      } else {
        // limpiar si no existe
        nombreCliente.value = '';
        apellidoCliente.value = '';
        telefonoCliente.value = '';
        correoCliente.value = '';
      }
    } catch (err) {
      console.error("❌ Error buscando cliente:", err);
    }
  });
  // === crear nueva reserva ===
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // 👇 DEBUG: Verificar datos antes de enviar
    const datosReserva = {
      dni: dniCliente.value.trim(),
      nombres: nombreCliente.value.trim(),
      apellidos: apellidoCliente.value.trim(),
      telefono: telefonoCliente.value.trim(),
      correo: correoCliente.value.trim(),
      fecha: fechaInput.value,
      horaInicio: horaInicioInput.value,
      horaFin: horaFinInput.value,
      mesa: selectMesa.value
    };

    console.log('📤 Enviando datos de reserva:', datosReserva);

    // Validación frontend
    if (!datosReserva.dni || !datosReserva.nombres || !datosReserva.apellidos || 
        !datosReserva.fecha || !datosReserva.horaInicio || !datosReserva.horaFin || 
        !datosReserva.mesa) {
      alert("⚠️ Completa todos los campos obligatorios (*)");
      return;
    }

    if (datosReserva.dni.length !== 8) {
      alert("⚠️ El DNI debe tener 8 dígitos");
      return;
    }

    if (datosReserva.horaInicio >= datosReserva.horaFin) {
      alert("⚠️ La hora de fin debe ser mayor a la hora de inicio");
      return;
    }

    try {
      // 👉 ENVIAR DIRECTAMENTE LOS DATOS COMPLETOS AL SERVIDOR
      console.log('📅 Creando reserva con datos COMPLETOS:', datosReserva);

      const res = await fetch(apiReservas, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(datosReserva)
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Reserva guardada correctamente");
        
        // ✅ ACTUALIZACIÓN INMEDIATA - Actualizar el estado de la mesa visualmente
        actualizarEstadoMesaVisual(datosReserva.mesa, 'Reservada');
        
        // Limpiar formulario pero mantener valores por defecto
        dniCliente.value = '';
        nombreCliente.value = '';
        apellidoCliente.value = '';
        telefonoCliente.value = '';
        correoCliente.value = '';
        fechaInput.value = hoy;
        horaInicioInput.value = "12:00";
        horaFinInput.value = "13:00";
        selectMesa.value = '';
        
        // Remover la mesa del select (ya no está disponible)
        const optionToRemove = selectMesa.querySelector(`option[value="${datosReserva.mesa}"]`);
        if (optionToRemove) {
          optionToRemove.remove();
        }

        // Actualizar otras vistas (con delay para evitar conflicto)
        setTimeout(async () => {
          await cargarTablaReservas();
          await actualizarMapaPorHora();
        }, 1000);

      } else {
        // Mostrar mensaje de error específico del servidor
        const mensajeError = data.camposFaltantes 
          ? `Faltan campos: ${data.camposFaltantes.join(', ')}`
          : data.mensaje || 'Error al guardar la reserva';
        
        alert("⚠️ " + mensajeError);
        console.error('Error del servidor:', data);
      }
    } catch (error) {
      console.error("❌ Error al guardar reserva:", error);
      alert("❌ Error: " + error.message);
    }
  });

  // === cambio de vista ===
  vistaTipo.addEventListener('change', e => {
    if (e.target.value === 'mapa') {
      vistaMapa.style.display = 'block';
      vistaTabla.style.display = 'none';
      actualizarMapaPorHora();
    } else {
      vistaMapa.style.display = 'none';
      vistaTabla.style.display = 'block';
      cargarTablaReservas();
    }
  });

  // === cambio de piso ===
  selectPiso.addEventListener('change', e => {
    const piso = parseInt(e.target.value);
    imagenPisoReserva.src = `../public/img/piso${piso}.png`;
    cargarMesas(piso);
  });

  // === botón actualizar mapa ===
  btnActualizarMapa.addEventListener('click', async () => {
    await actualizarMapaPorHora();
  });

  // === inicialización ===
  (async () => {
    await cargarMesas(1);
    await actualizarMapaPorHora();
    await cargarTablaReservas();
    setInterval(actualizarMapaPorHora, 60000);
  })();
}

// 🔥 FUNCIÓN NUEVA: Actualizar estado de mesa visualmente en el frontend
function actualizarEstadoMesaVisual(mesaId, nuevoEstado) {
    console.log(`🔄 Actualizando estado visual de mesa ${mesaId} a: ${nuevoEstado}`);
    
    // Actualizar en el select de mesas (remover la mesa de las opciones disponibles)
    const selectMesa = document.getElementById('mesa');
    if (selectMesa) {
        const optionToRemove = selectMesa.querySelector(`option[value="${mesaId}"]`);
        if (optionToRemove) {
            optionToRemove.remove();
            console.log('✅ Mesa removida del select de mesas disponibles');
        }
    }
    
    // Actualizar en el mapa visual si estamos en vista de mapa
    const mesaDiv = document.querySelector(`.mesa-circulo[data-id="${mesaId}"]`);
    if (mesaDiv) {
        // Remover clases de estado anteriores
        mesaDiv.classList.remove('mesa-libre', 'mesa-reservada', 'mesa-ocupada');
        
        // Agregar nueva clase de estado
        mesaDiv.classList.add(`mesa-${nuevoEstado.toLowerCase()}`);
        
        // Actualizar color según el estado
        const colores = {
            'Reservada': '#ffaa00',
            'Ocupada': '#ff4444', 
            'Libre': '#00cc88'
        };
        mesaDiv.style.backgroundColor = colores[nuevoEstado] || '#cccccc';
        
        // Actualizar tooltip
        const numeroMesa = mesaDiv.dataset.numero;
        mesaDiv.title = `Mesa ${numeroMesa} (${nuevoEstado})`;
        
        console.log('✅ Estado visual de mesa actualizado en el mapa');
    }
    
    // Mostrar notificación de éxito
    mostrarNotificacionReserva(`Mesa reservada correctamente. Estado actualizado a: ${nuevoEstado}`);
}

// 🔥 FUNCIÓN NUEVA: Mostrar notificación
function mostrarNotificacionReserva(mensaje) {
    // Crear notificación
    const notificacion = document.createElement('div');
    notificacion.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
    notificacion.style.zIndex = '9999';
    notificacion.style.minWidth = '300px';
    notificacion.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-check-circle me-2"></i>
            <span>${mensaje}</span>
            <button type="button" class="btn-close btn-close-white ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notificacion);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notificacion.parentElement) {
            notificacion.remove();
        }
    }, 5000);
}

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', initModuloReservas);  