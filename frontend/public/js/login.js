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
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contrasena })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.mensaje || 'Error en login';
      return;
    }

    // Redirigir según el rol
    const rol = data.usuario.rol;
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error(error);
    msg.textContent = 'No se pudo conectar al servidor';
  }
});

document.getElementById('btnInvitado')?.addEventListener('click', () => {
  window.location.href = 'menu-invitado.html';
});
