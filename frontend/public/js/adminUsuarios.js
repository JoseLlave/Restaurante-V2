function initModuloUsuarios() {
  console.log("Módulo Usuarios iniciado.");

  //  Referencias a elementos

  const tabla = document.getElementById('tablaUsuarios');
  const msg = document.getElementById('msgUsuarios');
  const formAgregarUsuario = document.getElementById('formAgregarUsuario');

  if (!tabla || !formAgregarUsuario) {
    console.warn("Elementos del módulo Usuarios no encontrados.");
    return;
  }

  // Modo edición

  let modoEditar = false;
  let usuarioEditandoId = null;


  //  Verificar autenticación y rol
  (async () => {
    try {
      const res = await fetch('http://localhost:4000/api/usuarios/me', { credentials: 'include' });
      if (!res.ok) throw new Error('No estás logueado');
      const data = await res.json();

      if (data.usuario.rol !== 'Administrador') {
        alert('Solo administradores pueden acceder');
        window.location.href = '/dashboard.html';
        return;
      }

      await cargarUsuarios();
    } catch (err) {
      console.error(err);
      alert('Debes iniciar sesión');
      window.location.href = '/login.html';
    }
  })();

  // 👥 Cargar usuarios - CORREGIDO
  async function cargarUsuarios() {
    msg.textContent = '';
    tabla.innerHTML = '<tr><td colspan="6" class="text-center">Cargando...</td></tr>';

    try {
      const res = await fetch('http://localhost:4000/api/usuarios', { credentials: 'include' });
      const usuarios = await res.json();

      if (!res.ok) {
        msg.textContent = usuarios.mensaje || 'Error al cargar usuarios';
        msg.className = 'msg text-danger';
        tabla.innerHTML = '';
        return;
      }

      if (!usuarios.length) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center">No hay usuarios</td></tr>';
        return;
      }

      // CORREGIDO: Mostrar datos estáticos, sin selects inline
      tabla.innerHTML = usuarios.map(u => `
        <tr>
          <td>${u.nombre}</td>
          <td>${u.correo}</td>
          <td>
            <span class="badge bg-${obtenerColorRol(u.rol)}">
              ${u.rol}
            </span>
          </td>
          <td>
            <span class="badge bg-${u.estado === 'activo' ? 'success' : 'danger'}">
              ${u.estado}
            </span>
          </td>
          <td>${new Date(u.fechaAlta).toLocaleString()}</td>
          <td>
            <button class="btn btn-sm btn-outline-warning me-1" onclick="editarUsuario('${u._id}')">
              ✏️ Editar
            </button>
            ${u.rol !== 'Administrador' ? `
              <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario('${u._id}')">
                🗑️ Eliminar
              </button>
            ` : '<span class="text-muted">No editable</span>'}
          </td>
        </tr>
      `).join('');

    } catch (err) {
      console.error(err);
      msg.textContent = 'Error de conexión';
      msg.className = 'msg text-danger';
      tabla.innerHTML = '';
    }
  }

  //  Editar usuario

  window.editarUsuario = async (id) => {
    try {
      const res = await fetch(`http://localhost:4000/api/usuarios/${id}`, { credentials: 'include' });
      const usuario = await res.json();

      if (!res.ok) {
        alert('Error al cargar usuario para editar');
        return;
      }

      // Llenar formulario con datos del usuario
      const inputNombre = document.getElementById('nuevoNombre');
      const inputCorreo = document.getElementById('nuevoCorreo');
      const inputContrasena = document.getElementById('nuevaContrasena');
      const selectRol = document.getElementById('nuevoRol');
      const selectEstado = document.getElementById('nuevoEstado');

      inputNombre.value = usuario.nombre;
      inputCorreo.value = usuario.correo;
      inputCorreo.disabled = true; // No se puede cambiar el correo
      inputContrasena.placeholder = 'Dejar vacío para no cambiar';
      selectRol.value = usuario.rol;
      selectEstado.value = usuario.estado;

      // Mostrar campos de estado si están ocultos
      if (selectEstado) {
        selectEstado.style.display = 'block';
        selectEstado.previousElementSibling.style.display = 'block';
      }

      // Cambiar texto del botón
      const btnCrearActualizar = document.getElementById('btnCrearActualizar');
      const tituloForm = document.getElementById('tituloFormUsuario');
      
      if (btnCrearActualizar) btnCrearActualizar.textContent = 'Actualizar';
      if (tituloForm) tituloForm.textContent = '✏️ Editar Usuario';

      modoEditar = true;
      usuarioEditandoId = id;

      // Scroll al formulario
      formAgregarUsuario.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      console.error('Error al editar usuario:', err);
      alert('Error al cargar usuario');
    }
  };

  // Crear / actualizar usuario - CORREGIDO

  formAgregarUsuario.addEventListener('submit', async e => {
    e.preventDefault();
    const msgCrear = document.getElementById('msgCrearUsuario');
    msgCrear.textContent = '';

    const inputNombre = document.getElementById('nuevoNombre');
    const inputCorreo = document.getElementById('nuevoCorreo');
    const inputContrasena = document.getElementById('nuevaContrasena');
    const selectRol = document.getElementById('nuevoRol');
    const selectEstado = document.getElementById('nuevoEstado');

    try {
      let res;
      let datos = {
        nombre: inputNombre.value.trim()
      };

      if (modoEditar && usuarioEditandoId) {
        // ACTUALIZAR usuario existente
        if (selectRol) datos.rol = selectRol.value;
        if (selectEstado) datos.estado = selectEstado.value;
        
        // Solo incluir contraseña si se proporcionó una nueva
        if (inputContrasena.value.trim()) {
          datos.contraseña = inputContrasena.value.trim();
        }

        res = await fetch(`http://localhost:4000/api/usuarios/${usuarioEditandoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(datos)
        });
      } else {
        // CREAR nuevo usuario
        if (!inputCorreo.value.trim() || !inputContrasena.value.trim()) {
          msgCrear.textContent = 'Correo y contraseña son obligatorios para crear usuario';
          msgCrear.className = 'msg text-danger';
          return;
        }

        datos.correo = inputCorreo.value.trim();
        datos.contraseña = inputContrasena.value.trim();
        datos.rol = selectRol ? selectRol.value : 'Mozo';

        res = await fetch('http://localhost:4000/api/usuarios/registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(datos)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        msgCrear.textContent = data.mensaje || 'Error al procesar';
        msgCrear.className = 'msg text-danger';
        return;
      }

      msgCrear.textContent = modoEditar ? 'Usuario actualizado' : 'Usuario creado';
      msgCrear.className = 'msg text-success';

      // Resetear formulario
      resetearFormulario();
      await cargarUsuarios();

    } catch (err) {
      console.error(err);
      msgCrear.textContent = 'Error de conexión';
      msgCrear.className = 'msg text-danger';
    }
  });

  //  Eliminar usuario

  window.eliminarUsuario = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const res = await fetch(`http://localhost:4000/api/usuarios/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.mensaje || 'Error al eliminar usuario');
        return;
      }

      alert('Usuario eliminado correctamente');
      await cargarUsuarios();

    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  // ================================
  // Resetear formulario
  // ================================
  function resetearFormulario() {
    formAgregarUsuario.reset();
    
    const inputCorreo = document.getElementById('nuevoCorreo');
    const inputContrasena = document.getElementById('nuevaContrasena');
    const selectEstado = document.getElementById('nuevoEstado');
    const btnCrearActualizar = document.getElementById('btnCrearActualizar');
    const tituloForm = document.getElementById('tituloFormUsuario');
    
    if (inputCorreo) inputCorreo.disabled = false;
    if (inputContrasena) inputContrasena.placeholder = 'Contraseña';
    if (selectEstado) {
      selectEstado.style.display = 'none';
      selectEstado.previousElementSibling.style.display = 'none';
    }
    if (btnCrearActualizar) btnCrearActualizar.textContent = 'Crear';
    if (tituloForm) tituloForm.textContent = '➕ Crear Usuario';
    
    modoEditar = false;
    usuarioEditandoId = null;
  }

  // ================================
  // Función auxiliar para colores de roles
  // ================================
  function obtenerColorRol(rol) {
    const colores = {
      'Administrador': 'danger',
      'Mozo': 'primary',
      'Cocinero': 'warning',
      'Cajero': 'info'
    };
    return colores[rol] || 'secondary';
  }
}