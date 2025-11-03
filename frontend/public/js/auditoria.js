function initModuloAuditoria() {
  console.log("Módulo Auditoría iniciado.");

  // Referencias a elementos
  const formFiltros = document.getElementById('formFiltrosAuditoria');
  const tablaBody = document.getElementById('tablaAuditoriaBody');
  const filtroModulo = document.getElementById('filtroModulo');
  const btnEliminarAntiguos = document.getElementById('btnEliminarAntiguos');
  const btnEliminarTodo = document.getElementById('btnEliminarTodo');
  const btnConfirmarEliminarAntiguos = document.getElementById('btnConfirmarEliminarAntiguos');
  const btnConfirmarEliminarTodo = document.getElementById('btnConfirmarEliminarTodo');
  const confirmacionEliminarTodo = document.getElementById('confirmacionEliminarTodo');

  // Modales (sin Bootstrap)
  const modalEliminarAntiguos = document.getElementById('modalEliminarAntiguos');
  const modalEliminarTodo = document.getElementById('modalEliminarTodo');

  const apiURL = "http://localhost:4000/api/auditoria";

  // Funciones para manejar modales manualmente
  function mostrarModal(modal) {
    modal.style.display = 'block';
    modal.classList.add('show');
  }

  function ocultarModal(modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }

  // Verificar autenticación y rol
  (async () => {
    try {
      const res = await fetch('http://localhost:4000/api/usuarios/me', { credentials: 'include' });
      if (!res.ok) throw new Error('No estás logueado');
      const data = await res.json();

      if (data.usuario.rol !== 'Administrador') {
        alert('Solo administradores pueden ver la auditoría');
        window.location.href = '/dashboard.html';
        return;
      }

      await cargarModulos();
      await cargarAuditoria();

    } catch (err) {
      console.error(err);
      alert('Debes iniciar sesión');
      window.location.href = '/login.html';
    }
  })();

  // Cargar módulos para filtro
  async function cargarModulos() {
    try {
      const res = await fetch(`${apiURL}/modulos`, { credentials: 'include' });
      const modulos = await res.json();

      if (res.ok && modulos.length > 0) {
        modulos.forEach(modulo => {
          const option = document.createElement('option');
          option.value = modulo;
          option.textContent = modulo;
          filtroModulo.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error cargando módulos:', err);
    }
  }

  // Cargar registros de auditoría
  async function cargarAuditoria(filtros = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros.rol && filtros.rol !== 'todos') params.append('rol', filtros.rol);
      if (filtros.modulo && filtros.modulo !== 'todos') params.append('modulo', filtros.modulo);

      const res = await fetch(`${apiURL}?${params}`, { credentials: 'include' });
      const auditoria = await res.json();

      if (!res.ok) {
        tablaBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar auditoría</td></tr>';
        return;
      }

      if (auditoria.length === 0) {
        tablaBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay registros de auditoría para los filtros seleccionados</td></tr>';
        return;
      }

      tablaBody.innerHTML = auditoria.map(registro => `
        <tr>
          <td>${new Date(registro.fecha).toLocaleString('es-PE')}</td>
          <td>${registro.usuario?.nombre || 'Usuario eliminado'}</td>
          <td><span class="badge bg-info">${registro.usuario?.rol || 'N/A'}</span></td>
          <td><span class="badge badge-modulo">${registro.modulo}</span></td>
          <td><span class="badge badge-accion">${registro.accion}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-info" onclick="mostrarDetallesAuditoria(${JSON.stringify(registro.detalles).replace(/"/g, '&quot;')})">
              Ver detalles
            </button>
          </td>
        </tr>
      `).join('');

    } catch (err) {
      console.error('Error al cargar auditoría:', err);
      tablaBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error de conexión</td></tr>';
    }
  }

  // Aplicar filtros
  formFiltros.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const filtros = {
      fechaDesde: document.getElementById('fechaDesde').value,
      fechaHasta: document.getElementById('fechaHasta').value,
      rol: document.getElementById('filtroRol').value,
      modulo: document.getElementById('filtroModulo').value
    };

    await cargarAuditoria(filtros);
  });

  // Eliminar registros antiguos
  btnEliminarAntiguos.addEventListener('click', () => {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    document.getElementById('fechaLimiteEliminar').value = hace30Dias.toISOString().split('T')[0];
    
    mostrarModal(modalEliminarAntiguos);
  });

  btnConfirmarEliminarAntiguos.addEventListener('click', async () => {
    const fechaLimite = document.getElementById('fechaLimiteEliminar').value;
    
    if (!fechaLimite) {
      alert('Selecciona una fecha límite');
      return;
    }

    if (!confirm(`¿Eliminar todos los registros anteriores a ${fechaLimite}?`)) {
      return;
    }

    try {
      const res = await fetch(`${apiURL}/antigua`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fechaLimite: fechaLimite })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensaje || 'Error al eliminar registros');
      }

      alert(`Registros eliminados correctamente.\n${data.mensaje}\nTotal eliminados: ${data.registrosEliminados}`);
      ocultarModal(modalEliminarAntiguos);
      await cargarAuditoria();

    } catch (err) {
      console.error('Error eliminando registros antiguos:', err);
      alert('Error: ' + err.message);
    }
  });

  // Eliminar TODOS los registros
  btnEliminarTodo.addEventListener('click', () => {
    confirmacionEliminarTodo.value = '';
    btnConfirmarEliminarTodo.disabled = true;
    mostrarModal(modalEliminarTodo);
  });

  // Validar confirmación
  confirmacionEliminarTodo.addEventListener('input', () => {
    btnConfirmarEliminarTodo.disabled = 
      confirmacionEliminarTodo.value !== 'ELIMINAR_TODO';
  });

  btnConfirmarEliminarTodo.addEventListener('click', async () => {
    if (confirmacionEliminarTodo.value !== 'ELIMINAR_TODO') {
      alert('Escribe exactamente: ELIMINAR_TODO');
      return;
    }

    if (!confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esta acción NO SE PUEDE DESHACER.')) {
      return;
    }

    try {
      const res = await fetch(apiURL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmar: 'ELIMINAR_TODO' })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensaje || 'Error al eliminar registros');
      }

      alert(`Registros eliminados correctamente.\n${data.mensaje}\nTotal eliminados: ${data.registrosEliminados}`);
      ocultarModal(modalEliminarTodo);
      await cargarAuditoria();

    } catch (err) {
      console.error('Error eliminando todos los registros:', err);
      alert('Error: ' + err.message);
    }
  });

  // Mostrar detalles
  window.mostrarDetallesAuditoria = (detalles) => {
    alert('Detalles de la acción:\n\n' + JSON.stringify(detalles, null, 2));
  };

  // Cerrar modales al hacer click en el botón de cerrar
  document.querySelectorAll('.btn-close').forEach(btn => {
    btn.addEventListener('click', function() {
      const modal = this.closest('.modal');
      ocultarModal(modal);
    });
  });

  // Cerrar modales al hacer click fuera del contenido
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        ocultarModal(this);
      }
    });
  });
}
