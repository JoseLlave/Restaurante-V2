function initModuloMesas() {
  console.log("🧩 Módulo Mesas interactivo iniciado.");

  // === Referencias a elementos ===
  const selectPiso = document.getElementById('selectPiso');
  const btnCrearMesaMapa = document.getElementById('btnCrearMesaMapa');
  const mapaContainer = document.getElementById('mapaMesasContainer');
  const mesasMapa = document.getElementById('mesasMapa');
  const imagenPiso = document.getElementById('imagenPiso');
  const selectVista = document.getElementById('tipoVista');
  const tablaMesasContainer = document.getElementById('tablaMesasContainer');
  
  // === Nuevas referencias para el formulario de tabla ===
  const formMesa = document.getElementById('formMesa');
  const mesaIdEditar = document.getElementById('mesaIdEditar');
  const nuevoNumero = document.getElementById('nuevoNumero');
  const nuevaCapacidad = document.getElementById('nuevaCapacidad');
  const nuevoEstado = document.getElementById('nuevoEstado');
  const nuevoPiso = document.getElementById('nuevoPiso');
  const nuevaUbicacion = document.getElementById('nuevaUbicacion');
  const btnCrearActualizar = document.getElementById('btnCrearActualizar');
  const msgCrearMesa = document.getElementById('msgCrearMesa');

  // === Configuración ===
  const apiURL = "http://localhost:4000/api/mesas";
  let mesas = [];
  let pisoActual = 1;
  let creandoMesa = false;
  let mostrarMapa = true;
  let editandoMesaId = null; // Para controlar si estamos editando

  // === Cargar mesas desde backend ===
  async function cargarMesas() {
    try {
      const res = await fetch(apiURL);
      mesas = await res.json();
      renderizarMesas();
      renderizarTablaMesas();
    } catch (err) {
      console.error("Error al cargar mesas:", err);
    }
  }

  // === Renderizar mesas en el mapa ===
  function renderizarMesas() {
    if (!mostrarMapa) return;
    mesasMapa.innerHTML = '';
    mesas
      .filter(m => m.piso === pisoActual)
      .forEach(mesa => crearElementoMesa(mesa));
  }

  function crearElementoMesa(mesa) {
    // Solo crear elementos en el mapa si tienen coordenadas definidas
    if (mesa.posX === 0 && mesa.posY === 0) return;
    
    const mesaDiv = document.createElement('div');
    mesaDiv.classList.add('mesa-circulo');
    mesaDiv.style.left = mesa.posX + '%';
    mesaDiv.style.top = mesa.posY + '%';
    mesaDiv.dataset.id = mesa._id;
    mesaDiv.dataset.numero = mesa.numero;

    const colores = {
      "Libre": "#00cc88",
      "Ocupada": "#ff4444",
      "Reservada": "#ffaa00",
      "Pendiente de pago": "#0099ff",
      "Cerrada": "#999999"
    };
    mesaDiv.style.backgroundColor = colores[mesa.estado] || "#cccccc";
    mesaDiv.title = `Mesa ${mesa.numero} (${mesa.estado})`;

    mesaDiv.addEventListener('dblclick', () => abrirEditorMesa(mesa));
    mesasMapa.appendChild(mesaDiv);
  }

  // === Renderizar mesas en tabla ===
  function renderizarTablaMesas() {
    const tbody = document.getElementById('tablaMesasBody');
    if (!tbody) return;
    
    if (mesas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay mesas registradas</td></tr>';
      return;
    }

    tbody.innerHTML = mesas.map(m => `
      <tr>
        <td>${m.numero}</td>
        <td>${m.capacidad}</td>
        <td>
          <span class="badge bg-${m.estado === 'Libre' ? 'success' :
                                  m.estado === 'Ocupada' ? 'danger' :
                                  m.estado === 'Reservada' ? 'warning' :
                                  m.estado === 'Pendiente de pago' ? 'info' : 'secondary'}">
            ${m.estado}
          </span>
        </td>
        <td>${m.piso}</td>
        <td>${m.ubicacion || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editarMesaDesdeTabla('${m._id}')">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="eliminarMesa('${m._id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  // === FUNCIONALIDAD DEL FORMULARIO DE TABLA ===
  
  // Configurar el formulario
  formMesa.addEventListener('submit', async (e) => {
    e.preventDefault();
    await guardarMesaDesdeFormulario();
  });

  async function guardarMesaDesdeFormulario() {
    const mesaData = {
      numero: parseInt(nuevoNumero.value),
      capacidad: parseInt(nuevaCapacidad.value),
      estado: nuevoEstado.value,
      piso: parseInt(nuevoPiso.value),
      ubicacion: nuevaUbicacion.value.trim(),
      // Para mesas creadas desde tabla, no usamos coordenadas del mapa
      posX: 0,
      posY: 0
    };

    try {
      let response;
      if (editandoMesaId) {
        // Actualizar mesa existente
        response = await fetch(`${apiURL}/${editandoMesaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mesaData)
        });
        mostrarMensaje("✅ Mesa actualizada correctamente", "success");
      } else {
        // Crear nueva mesa
        response = await fetch(apiURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mesaData)
        });
        mostrarMensaje("✅ Mesa creada correctamente", "success");
      }

      const mesaGuardada = await response.json();
      
      // Actualizar lista local
      if (editandoMesaId) {
        mesas = mesas.map(m => m._id === editandoMesaId ? mesaGuardada : m);
      } else {
        mesas.push(mesaGuardada);
      }

      // Resetear formulario y recargar vistas
      resetearFormulario();
      renderizarMesas();
      renderizarTablaMesas();

    } catch (err) {
      console.error("Error al guardar mesa:", err);
      mostrarMensaje("❌ Error al guardar la mesa", "error");
    }
  }

  function editarMesaDesdeTabla(id) {
    const mesa = mesas.find(m => m._id === id);
    if (!mesa) return;

    // Llenar formulario con datos de la mesa
    mesaIdEditar.value = mesa._id;
    nuevoNumero.value = mesa.numero;
    nuevaCapacidad.value = mesa.capacidad;
    nuevoEstado.value = mesa.estado;
    nuevoPiso.value = mesa.piso;
    nuevaUbicacion.value = mesa.ubicacion || '';

    // Cambiar texto del botón
    btnCrearActualizar.textContent = "Actualizar";
    document.getElementById('tituloFormMesa').textContent = "✏️ Editar Mesa";

    editandoMesaId = id;
    
    // Hacer scroll al formulario
    formMesa.scrollIntoView({ behavior: 'smooth' });
  }

  function resetearFormulario() {
    formMesa.reset();
    mesaIdEditar.value = '';
    btnCrearActualizar.textContent = "Crear";
    document.getElementById('tituloFormMesa').textContent = "➕ Crear Mesa";
    editandoMesaId = null;
    msgCrearMesa.textContent = '';
  }

  function mostrarMensaje(mensaje, tipo) {
    msgCrearMesa.textContent = mensaje;
    msgCrearMesa.className = `msg text-center mt-2 ${tipo === 'success' ? 'text-success' : 'text-danger'}`;
    
    setTimeout(() => {
      msgCrearMesa.textContent = '';
    }, 3000);
  }

  // === Eliminar mesa (común para mapa y tabla) ===
  async function eliminarMesa(id) {
    if (!confirm("¿Eliminar esta mesa?")) return;
    try {
      await fetch(`${apiURL}/${id}`, { method: "DELETE" });
      mesas = mesas.filter(m => m._id !== id);
      renderizarMesas();
      renderizarTablaMesas();
      mostrarMensaje("✅ Mesa eliminada correctamente", "success");
    } catch (err) {
      console.error("Error al eliminar mesa:", err);
      mostrarMensaje("❌ Error al eliminar la mesa", "error");
    }
  }

  // === Cambiar de piso ===
  selectPiso.addEventListener('change', e => {
    pisoActual = parseInt(e.target.value);
    imagenPiso.src = `../public/img/piso${pisoActual}.png`;
    renderizarMesas();
  });

  // === Cambiar de vista (mapa o tabla) ===
  selectVista.addEventListener('change', e => {
    mostrarMapa = e.target.value === 'mapa';
    mapaContainer.style.display = mostrarMapa ? 'block' : 'none';
    tablaMesasContainer.style.display = mostrarMapa ? 'none' : 'block';
    if (mostrarMapa) {
      renderizarMesas();
    } else {
      renderizarTablaMesas();
    }
  });

  // === Crear nueva mesa (modo mapa) ===
  btnCrearMesaMapa.addEventListener('click', () => {
    if (creandoMesa) return alert("⚠️ Ya estás creando una mesa.");
    creandoMesa = true;
    crearNuevaMesaEnMapa();
  });

  // === Editor de mesa (solo para mapa) ===
  function abrirEditorMesa(mesa) {
    const editor = document.getElementById('editorMesaContainer');
    const titulo = document.getElementById('editorTitulo');
    const inputCapacidad = document.getElementById('capacidadEditar');
    const selectEstado = document.getElementById('estadoEditar');
    const btnGuardar = document.getElementById('btnGuardarMesa');
    const btnEliminar = document.getElementById('btnEliminarMesa');
    const btnCancelar = document.getElementById('btnCancelarMesa');
    const btnCerrar = document.getElementById('btnCerrarEditor');

    editor.style.display = 'block';
    titulo.childNodes[0].nodeValue = `Editar Mesa ${mesa.numero} `;
    inputCapacidad.value = mesa.capacidad;
    selectEstado.value = mesa.estado;

    [btnGuardar, btnEliminar, btnCancelar, btnCerrar].forEach(b => (b.onclick = null));

    // Guardar cambios
    btnGuardar.onclick = async () => {
      const capacidad = parseInt(inputCapacidad.value);
      const estado = selectEstado.value;
      await actualizarMesa(mesa._id, { capacidad, estado });
      editor.style.display = 'none';
    };

    // Eliminar mesa
    btnEliminar.onclick = async () => {
      if (!confirm(`¿Eliminar la mesa ${mesa.numero}?`)) return;
      await eliminarMesa(mesa._id);
      editor.style.display = 'none';
    };

    btnCancelar.onclick = btnCerrar.onclick = () => {
      editor.style.display = 'none';
    };
  }

  // === Actualizar mesa ===
  async function actualizarMesa(id, data) {
    try {
      const res = await fetch(`${apiURL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const updatedMesa = await res.json();
      mesas = mesas.map(m => (m._id === id ? updatedMesa : m));
      renderizarMesas();
      renderizarTablaMesas();
    } catch (err) {
      console.error("Error al actualizar mesa:", err);
      alert("❌ Error al guardar los cambios");
    }
  }

  // === Crear nueva mesa en el mapa ===
  function crearNuevaMesaEnMapa() {
    const nuevaMesa = document.createElement('div');
    nuevaMesa.classList.add('mesa-circulo', 'mesa-nueva');
    nuevaMesa.style.left = '50%';
    nuevaMesa.style.top = '50%';
    mesasMapa.appendChild(nuevaMesa);

    let moviendo = false;

    nuevaMesa.addEventListener('mousedown', e => {
      moviendo = true;
    });

    window.addEventListener('mousemove', e => {
      if (!moviendo) return;
      const rect = mesasMapa.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;

      x = Math.max(2, Math.min(98, x));
      y = Math.max(2, Math.min(98, y));

      nuevaMesa.style.left = `${x}%`;
      nuevaMesa.style.top = `${y}%`;
    });

    window.addEventListener(
      'mouseup',
      async () => {
        if (!moviendo) return;
        moviendo = false;

        const posX = parseFloat(nuevaMesa.style.left);
        const posY = parseFloat(nuevaMesa.style.top);

        const colision = mesas.some(
          m =>
            m.piso === pisoActual &&
            Math.abs(m.posX - posX) < 7 &&
            Math.abs(m.posY - posY) < 7
        );
        if (colision) {
          alert("⚠️ Demasiado cerca de otra mesa.");
          nuevaMesa.remove();
          creandoMesa = false;
          return;
        }

        try {
          const numero = Math.max(...mesas.map(m => m.numero), 0) + 1;
          const mesa = await crearMesa({ 
            numero, 
            capacidad: 4, 
            estado: "Libre", 
            piso: pisoActual, 
            posX, 
            posY,
            ubicacion: `Piso ${pisoActual} - Mapa` 
          });
          mesas.push(mesa);
          renderizarMesas();
          renderizarTablaMesas();
        } catch (err) {
          console.error("Error al crear mesa:", err);
        } finally {
          nuevaMesa.remove();
          creandoMesa = false;
        }
      },
      { once: true }
    );
  }

  // === Crear mesa ===
  async function crearMesa(data) {
    const res = await fetch(apiURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  // === Hacer funciones globales para los botones de la tabla ===
  window.editarMesaDesdeTabla = editarMesaDesdeTabla;
  window.eliminarMesa = eliminarMesa;

  // === Inicializar ===
  cargarMesas();
}

// Ejecutar cuando cargue el documento
document.addEventListener("DOMContentLoaded", initModuloMesas);