function initModuloUsuarios() {
  console.log("🧩 Módulo Usuarios iniciado.");

  // ================================
  //  Referencias a elementos
  // ================================
  const tabla = document.getElementById('tablaUsuarios');
  const msg = document.getElementById('msgUsuarios');
  const formAgregarUsuario = document.getElementById('formAgregarUsuario');

  if (!tabla || !formAgregarUsuario) {
    console.warn("⚠️ Elementos del módulo Usuarios no encontrados.");
    return;
  }

  // ================================
  // 🔹 Modo edición
  // ================================
  let modoEditar = false;
  let usuarioEditandoId = null;

  // ================================
  //  Verificar autenticación y rol
  // ================================
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

  // ================================
  // 👥 Cargar usuarios
  // ================================
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

      tabla.innerHTML = usuarios.map(u => `
        <tr>
          <td>${u.nombre}</td>
          <td>${u.correo}</td>
          <td>
            <select onchange="actualizarRol('${u._id}', this.value)" class="form-select form-select-sm">
              <option value="Administrador" ${u.rol === 'Administrador' ? 'selected' : ''}>Administrador</option>
              <option value="Mozo" ${u.rol === 'Mozo' ? 'selected' : ''}>Mozo</option>
              <option value="Cocinero" ${u.rol === 'Cocinero' ? 'selected' : ''}>Cocinero</option>
              <option value="Cajero" ${u.rol === 'Cajero' ? 'selected' : ''}>Cajero</option>
            </select>
          </td>
          <td>
            <select onchange="actualizarEstado('${u._id}', this.value)" class="form-select form-select-sm">
              <option value="activo" ${u.estado === 'activo' ? 'selected' : ''}>Activo</option>
              <option value="inactivo" ${u.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </td>
          <td>${new Date(u.fechaAlta).toLocaleString()}</td>
          <td>
            <button class="btn btn-editar btn-sm" onclick="editarUsuario('${u.nombre}', '${u._id}')">Editar</button>
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

  // ================================
  //  Editar usuario
  // ================================
  window.editarUsuario = (nombre, id) => {
    const inputNombre = document.getElementById('nuevoNombre');
    const inputCorreo = document.getElementById('nuevoCorreo');
    const inputContrasena = document.getElementById('nuevaContrasena');
    const selectRol = document.getElementById('nuevoRol');

    inputNombre.value = nombre;
    inputCorreo.disabled = true;
    inputContrasena.disabled = true;
    selectRol.disabled = true;

    modoEditar = true;
    usuarioEditandoId = id;
  };

  // ================================
  // ➕ Crear / actualizar usuario
  // ================================
  formAgregarUsuario.addEventListener('submit', async e => {
    e.preventDefault();
    const msgCrear = document.getElementById('msgCrearUsuario');
    msgCrear.textContent = '';

    const inputNombre = document.getElementById('nuevoNombre');
    const inputCorreo = document.getElementById('nuevoCorreo');
    const inputContrasena = document.getElementById('nuevaContrasena');
    const selectRol = document.getElementById('nuevoRol');

    try {
      let res;
      if (modoEditar && usuarioEditandoId) {
        res = await fetch(`http://localhost:4000/api/usuarios/${usuarioEditandoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ nombre: inputNombre.value.trim() })
        });
      } else {
        res = await fetch('http://localhost:4000/api/usuarios/registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nombre: inputNombre.value.trim(),
            correo: inputCorreo.value.trim(),
            contrasena: inputContrasena.value.trim(),
            rol: selectRol.value
          })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        msgCrear.textContent = data.mensaje || 'Error al procesar';
        msgCrear.className = 'msg text-danger';
        return;
      }

      msgCrear.textContent = modoEditar ? ' Nombre actualizado' : ' Usuario creado';
      msgCrear.className = 'msg text-success';

      formAgregarUsuario.reset();
      inputCorreo.disabled = false;
      inputContrasena.disabled = false;
      selectRol.disabled = false;

      modoEditar = false;
      usuarioEditandoId = null;

      cargarUsuarios();

    } catch (err) {
      console.error(err);
      msgCrear.textContent = 'Error de conexión';
      msgCrear.className = 'msg text-danger';
    }
  });

  // ================================
  //  Actualizar rol
  // ================================
  window.actualizarRol = async (id, rol) => {
    msg.textContent = '';
    try {
      const res = await fetch(`http://localhost:4000/api/usuarios/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol })
      });
      const data = await res.json();

      if (res.ok) {
        msg.textContent = ' Rol actualizado';
        msg.className = 'msg text-success';
        const fila = document.querySelector(`button[onclick*="${id}"]`)?.closest('tr');
        if (fila) {
          fila.classList.add('fila-actualizada');
          setTimeout(() => fila.classList.remove('fila-actualizada'), 1200);
        }
      } else {
        msg.textContent = data.mensaje;
        msg.className = 'msg text-danger';
      }

    } catch (err) {
      msg.textContent = 'Error de conexión';
      msg.className = 'msg text-danger';
    }
  };

  // ================================
  //  Actualizar estado
  // ================================
  window.actualizarEstado = async (id, estado) => {
    msg.textContent = '';
    try {
      const res = await fetch(`http://localhost:4000/api/usuarios/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
      const data = await res.json();

      if (res.ok) {
        msg.textContent = ' Estado actualizado';
        msg.className = 'msg text-success';
        const fila = document.querySelector(`button[onclick*="${id}"]`)?.closest('tr');
        if (fila) {
          fila.classList.add('fila-actualizada');
          setTimeout(() => fila.classList.remove('fila-actualizada'), 1200);
        }
      } else {
        msg.textContent = data.mensaje;
        msg.className = 'msg text-danger';
      }

    } catch (err) {
      msg.textContent = 'Error de conexión';
      msg.className = 'msg text-danger';
    }
  };
}
