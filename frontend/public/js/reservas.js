// === MÓDULO RESERVAS ===
function initModuloReservas() {
  console.log("📅 Módulo Reservas iniciado.");

  // === referencias ===
  const selectMesa = document.getElementById('mesa');
  const form = document.getElementById('formReserva');
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

  const dniCliente = document.getElementById('dniCliente');
  const nombreCliente = document.getElementById('nombreCliente');
  const apellidoCliente = document.getElementById('apellidoCliente');
  const telefonoCliente = document.getElementById('telefonoCliente');
  const correoCliente = document.getElementById('correoCliente');

  // === rutas del backend ===
  const apiMesas = "http://localhost:4000/api/mesas";
  const apiReservas = "http://localhost:4000/api/reservas";
  const apiClientes = "http://localhost:4000/api/clientes";

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
          option.textContent = `Mesa ${m.numero} (Piso ${m.piso})`;
          selectMesa.appendChild(option);

          // círculo en el mapa
          const mesaDiv = document.createElement('div');
          mesaDiv.classList.add('mesa-circulo');
          mesaDiv.textContent = m.numero;
          mesaDiv.dataset.id = m._id;

          mesaDiv.style.top = `${m.posY}%`;
          mesaDiv.style.left = `${m.posX}%`;
          mesaDiv.style.transform = 'translate(-50%, -50%)';

          mesaDiv.addEventListener('click', () => {
            selectMesa.value = m._id;
            alert(`Mesa ${m.numero} seleccionada`);
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
      ahora.setHours(h, m, 0, 0);

      document.querySelectorAll('.mesa-circulo').forEach(mesaDiv => {
        mesaDiv.classList.remove('mesa-ocupada', 'mesa-reservada', 'mesa-libre');
        mesaDiv.classList.add('mesa-libre');

        const reservasMesa = reservas.filter(r => r.mesa?._id === mesaDiv.dataset.id);
        reservasMesa.forEach(r => {
          const inicio = new Date(`${r.fecha}T${r.horaInicio}`);
          const fin = new Date(`${r.fecha}T${r.horaFin}`);
          if (ahora >= inicio && ahora <= fin) {
            mesaDiv.classList.remove('mesa-libre');
            mesaDiv.classList.add('mesa-reservada');
          }
        });
      });
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
          <td>${r.cliente?.nombre || 'Sin nombre'}</td>
          <td>${r.fecha}</td>
          <td>${r.horaInicio}</td>
          <td>${r.horaFin}</td>
          <td>Mesa ${r.mesa?.numero || '-'}</td>
          <td>${r.estado || 'Pendiente'}</td>
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
  if (!dni) return;

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

  try {
    // ✅ asegúrate de que los campos existan y no estén vacíos
    const clienteData = {
      dni: dniCliente.value.trim(),
      nombres: nombreCliente.value.trim(),
      apellidos: apellidoCliente.value.trim(),
      telefono: telefonoCliente.value.trim(),
      correo: correoCliente.value.trim()
    };

    // Validación rápida
    if (!clienteData.dni || !clienteData.nombres || !clienteData.apellidos) {
      alert("⚠️ Debes ingresar DNI, nombre y apellidos del cliente");
      return;
    }

    // 👉 crear o buscar cliente
    const clienteRes = await fetch(`${apiClientes}/buscar-o-crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clienteData)
    });

    const cliente = await clienteRes.json();

    // 👉 crear reserva
    const reservaData = {
      cliente: cliente._id,
      fecha: form.fecha.value,
      horaInicio: form.horaInicio.value,
      horaFin: form.horaFin.value,
      mesa: form.mesa.value,
      estado: "Pendiente"
    };

    const res = await fetch(apiReservas, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservaData)
    });

    if (res.ok) {
      alert("✅ Reserva guardada correctamente");
      form.reset();
      await cargarTablaReservas();
      await actualizarMapaPorHora();
    } else {
      alert("⚠️ Error al guardar la reserva");
      console.error(await res.text());
    }
  } catch (error) {
    console.error("❌ Error al guardar reserva:", error);
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

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', initModuloReservas);
