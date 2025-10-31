// frontend/public/js/login.js
const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';

  const correo = document.getElementById('correo').value.trim();
  const contrasena = document.getElementById('contraseña')?.value || document.getElementById('contrasena')?.value;

  try {
    const res = await fetch('http://localhost:4000/api/usuarios/login', {
      method: 'POST',
      credentials: 'include', // necesario para enviar cookies
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contrasena }) // 🔑 usamos 'contrasena' sin ñ
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.mensaje || 'Error en login';
      return;
    }

    // Redirigir según el rol
    const rol = data.usuario.rol;
    if (rol === 'Administrador') window.location.href = 'dashboard.html';
    else if (rol === 'Mesero') window.location.href = 'pedidos.html';
    else if (rol === 'Cocinero') window.location.href = 'cocina.html';
    else if (rol === 'Cajero') window.location.href = 'caja.html';
    else if (rol === 'Recepcionista') window.location.href = 'reservas.html';
    else window.location.href = 'menu-invitado.html';
  } catch (error) {
    console.error(error);
    msg.textContent = 'No se pudo conectar al servidor';
  }
});

document.getElementById('btnInvitado')?.addEventListener('click', () => {
  window.location.href = 'menu-invitado.html';
});
