// === Selección de elementos ===
const navLinks = document.querySelectorAll('.nav-link');
const vistaActiva = document.getElementById('vistaActiva');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

let moduloActual = null; // Guarda el módulo actualmente cargado

// ================================
// 📦 Cargar módulos dinámicamente
// ================================
async function cargarModulo(modulo) {
  try {
    // 1️⃣ Cargar el HTML del módulo
    const res = await fetch(`/html/${modulo}.html`);
    if (!res.ok) throw new Error("No se encontró el módulo");
    const html = await res.text();
    vistaActiva.innerHTML = html;

    // 2️⃣ Nombre de la función inicializadora del módulo (ej: initModuloUsuarios)
    const initName = `initModulo${capitalizar(modulo)}`;

    // 3️⃣ Determinar el path correcto del script
    let scriptPath =
      modulo === 'usuarios'
        ? '/public/js/adminUsuarios.js'
        : `/public/js/${modulo}.js`;

    // 🔹 NUEVO: Cargar también el CSS del módulo si existe
    const cssPath = `/public/css/${modulo}.css`;
    cargarEstilo(cssPath);

    // 4️⃣ Si el script ya está cargado, solo ejecutamos su init
    const existingScript = document.querySelector(`script[data-modulo="${modulo}"]`);
    if (existingScript) {
      console.log(`♻️ Reutilizando script del módulo "${modulo}"`);
      if (typeof window[initName] === 'function') {
        window[initName]();
      } else {
        console.warn(`⚠️ No se encontró ${initName} para reejecutar`);
      }
      return;
    }

    // 5️⃣ Si no está cargado, lo agregamos dinámicamente
    const script = document.createElement('script');
    script.src = scriptPath + '?v=' + Date.now(); // evita cache
    script.defer = true;
    script.dataset.modulo = modulo; // para identificarlo luego

    script.onload = () => {
      console.log(`✅ Script para módulo "${modulo}" cargado correctamente.`);
      if (typeof window[initName] === 'function') {
        console.log(`🔹 Ejecutando ${initName}()...`);
        window[initName]();
      } else {
        console.warn(`⚠️ No se encontró la función ${initName} después de cargar el script`);
      }
    };

    script.onerror = () => {
      console.error(`❌ Error al cargar el script: ${scriptPath}`);
      vistaActiva.innerHTML += `<p class="text-danger mt-3">No se pudo cargar el script del módulo (${modulo}).</p>`;
    };

    document.body.appendChild(script);
    moduloActual = modulo;

  } catch (err) {
    console.error(err);
    vistaActiva.innerHTML = `<p class="text-danger">Error al cargar módulo: ${err.message}</p>`;
  }
}

// ================================
// 🧭 Navegación del sidebar
// ================================
navLinks.forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();

    // Marcar activo en el menú
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Obtener el módulo
    const pagina = link.getAttribute('data-page');
    console.log(`📦 Cambiando a módulo: ${pagina}`);
    await cargarModulo(pagina);
  });
});

// ================================
// 🔐 Cerrar sesión
// ================================
btnCerrarSesion.addEventListener('click', async () => {
  try {
    await fetch('/api/usuarios/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  } catch (err) {
    alert('Error al cerrar sesión');
  }
});

// ================================
// 🧩 Funciones auxiliares
// ================================
function capitalizar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 🔹 NUEVO: función para cargar CSS del módulo dinámicamente
function cargarEstilo(path) {
  fetch(path, { method: 'HEAD' })
    .then(res => {
      if (res.ok) {
        // Eliminar estilos anteriores del mismo módulo si existen
        document.querySelectorAll(`link[data-modulo-css]`).forEach(link => link.remove());

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path + '?v=' + Date.now(); // evitar cache
        link.dataset.moduloCss = true;
        document.head.appendChild(link);
        console.log(`🎨 Estilo "${path}" cargado correctamente.`);
      } else {
        console.warn(`⚠️ No se encontró el CSS del módulo (${path}).`);
      }
    })
    .catch(() => {
      console.warn(`⚠️ Error al intentar cargar CSS: ${path}`);
    });
}
