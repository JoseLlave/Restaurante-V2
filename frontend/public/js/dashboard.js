// === Selección de elementos ===
const navLinks = document.querySelectorAll('.nav-link');
const vistaActiva = document.getElementById('vistaActiva');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

let moduloActual = null;
let intervaloActualizacion = null;

// ================================
// 📦 Cargar módulos dinámicamente
// ================================
async function cargarModulo(modulo) {
  try {
    // Determinar qué HTML cargar según el rol y módulo
    let htmlFile = modulo;
    let initName = `initModulo${capitalizar(modulo)}`; // 🔥 MOVER AQUÍ
    
    const usuario = await obtenerUsuarioActual();
    
    // 🔥 ACTUALIZADO: Versiones de solo lectura para Mozo
    if (usuario && usuario.rol === 'Mozo') {
      if (modulo === 'mesas') {
        htmlFile = 'mesas-mozo';
        initName = 'initModuloMesas'; // ✅ Misma función que admin
      } else if (modulo === 'reservas') {
        htmlFile = 'reservas-mozo';
        initName = 'initModuloReservasMozo'; // ✅ Función específica
      }
    }

    // 1️⃣ Cargar el HTML del módulo
    const res = await fetch(`/html/${htmlFile}.html`);
    if (!res.ok) throw new Error("No se encontró el módulo");
    const html = await res.text();
    vistaActiva.innerHTML = html;

    // 2️⃣ Determinar el path correcto del script
    let scriptPath = '';
    if (modulo === 'usuarios') {
      scriptPath = '/public/js/adminUsuarios.js';
    } else if (usuario && usuario.rol === 'Mozo') {
      if (modulo === 'mesas') {
        scriptPath = '/public/js/mesas-mozo.js';
      } else if (modulo === 'reservas') {
        scriptPath = '/public/js/reservas-mozo.js';
      } else {
        scriptPath = `/public/js/${modulo}.js`;
      }
    } else {
      scriptPath = `/public/js/${modulo}.js`;
    }

    // 🔹 Cargar también el CSS del módulo si existe
    const cssPath = `/public/css/${modulo}.css`;
    cargarEstilo(cssPath);

    // 3️⃣ Si el script ya está cargado, solo ejecutamos su init
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

    // 4️⃣ Si no está cargado, lo agregamos dinámicamente
    const script = document.createElement('script');
    script.src = scriptPath + '?v=' + Date.now();
    script.defer = true;
    script.dataset.modulo = modulo;

    script.onload = () => {
      console.log(`✅ Script para módulo "${modulo}" cargado correctamente.`);
      console.log(`🔹 Buscando función: ${initName}`);
      if (typeof window[initName] === 'function') {
        console.log(`🔹 Ejecutando ${initName}()...`);
        window[initName]();
      } else {
        console.warn(`⚠️ No se encontró la función ${initName} después de cargar el script`);
        // 🔥 INTENTAR EJECUTAR LA FUNCIÓN DE TODAS FORMAS
        if (modulo === 'reservas' && usuario && usuario.rol === 'Mozo') {
          console.log("🔄 Intentando ejecutar initModuloReservasMozo directamente...");
          if (typeof window.initModuloReservasMozo === 'function') {
            window.initModuloReservasMozo();
          }
        }
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

    // Limpiar recursos del módulo anterior
    if (moduloActual) {
      const cleanupFunction = window[`cleanup${capitalizar(moduloActual)}`];
      if (typeof cleanupFunction === 'function') {
        cleanupFunction();
      }
    }

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
    // Detener actualizaciones automáticas
    if (intervaloActualizacion) {
      clearInterval(intervaloActualizacion);
    }
    
    // Limpiar recursos del módulo actual
    if (moduloActual) {
      const cleanupFunction = window[`cleanup${capitalizar(moduloActual)}`];
      if (typeof cleanupFunction === 'function') {
        cleanupFunction();
      }
    }
    
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

function cargarEstilo(path) {
  fetch(path, { method: 'HEAD' })
    .then(res => {
      if (res.ok) {
        // Eliminar estilos anteriores del mismo módulo si existen
        document.querySelectorAll(`link[data-modulo-css]`).forEach(link => link.remove());

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path + '?v=' + Date.now();
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

// ================================
// 👤 Obtener usuario actual
// ================================
async function obtenerUsuarioActual() {
  try {
    const res = await fetch('/api/usuarios/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return data.usuario;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
}

// ================================
// 🎯 CONFIGURACIÓN POR ROL
// ================================

// Función principal de configuración
async function configurarDashboardPorRol() {
  try {
    const res = await fetch('/api/usuarios/me', { credentials: 'include' });
    const data = await res.json();
    const rol = data.usuario.rol;

    // Actualizar info de usuario
    document.getElementById('nombreUsuario').textContent = `Hola, ${data.usuario.nombre}`;
    document.getElementById('rolUsuario').textContent = rol;

    // Configurar según rol
    if (rol === 'Mozo') {
      await configurarDashboardMozo();
    } else if (rol === 'Administrador') {
      await configurarDashboardAdmin();
    } else if (rol === 'Cocinero') {
      await configurarDashboardCocinero();
    } else if (rol === 'Cajero') {
      await configurarDashboardCajero();
    }

  } catch (error) {
    console.error('Error al cargar datos de usuario:', error);
    window.location.href = '/login.html';
  }
}

// ================================
// 👨‍💼 CONFIGURACIÓN MOZO - ACTUALIZADO
// ================================
async function configurarDashboardMozo() {
    console.log("👨‍💼 Configurando dashboard para Mozo");
    
    // Ocultar módulos no permitidos
    ocultarModulosNoPermitidos('Mozo');
    
    // Cargar módulo por defecto
    await cargarModulo('pedidos');
    
    // 🔥 ACTUALIZADO: Iniciar actualizaciones con frecuencia reducida
    iniciarActualizacionesAutomaticasMozo();
}

function iniciarActualizacionesAutomaticasMozo() {
    // Limpiar intervalo anterior si existe
    if (intervaloActualizacion) {
        clearInterval(intervaloActualizacion);
    }
    
    // 🔥 ACTUALIZADO: 60 segundos para evitar saturación
    intervaloActualizacion = setInterval(async () => {
        await actualizarDatosEnTiempoRealMozo();
    }, 60000); // 60 segundos
    
    console.log("🔄 Actualizaciones automáticas iniciadas (cada 60s)");
}

// 🔥 ACTUALIZADO: Función corregida para evitar bucle
async function actualizarDatosEnTiempoRealMozo() {
    try {
        console.log("🔄 Actualización automática Mozo");
        
        // Solo actualizar datos si el módulo actual lo requiere
        if (moduloActual === 'mesas') {
            await actualizarVistaMesas();
        } else if (moduloActual === 'reservas') {
            // 🔥 CORREGIDO: Usar el nombre correcto de la función
            await cargarReservasParaMozo();
        } else if (moduloActual === 'pedidos') {
            await actualizarVistaPedidos();
        }
        
    } catch (error) {
        console.error('Error en actualización automática Mozo:', error);
    }
}

// 🔥 NUEVA FUNCIÓN: Cargar reservas específicamente para mozo
async function cargarReservasParaMozo() {
    try {
        const res = await fetch('/api/reservas', { credentials: 'include' });
        const reservas = await res.json();
        
        // Si estamos viendo reservas-mozo y existe función de actualización
        if (moduloActual === 'reservas' && typeof window.actualizarVistaReservasMozo === 'function') {
            window.actualizarVistaReservasMozo(reservas);
        }
        
    } catch (error) {
        console.error('Error actualizando reservas para mozo:', error);
    }
}

// Función específica para actualizar mesas
async function actualizarVistaMesas() {
    try {
        const res = await fetch('/api/mesas', { 
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!res.ok) {
            console.error(`❌ Error ${res.status} al actualizar mesas`);
            return;
        }
        
        const mesas = await res.json();
        
        // Verificar que sea un array antes de pasar a la función
        if (Array.isArray(mesas)) {
            // Si estamos viendo mesas, actualizar la vista
            if (moduloActual === 'mesas' && typeof window.actualizarVistaMesasMozo === 'function') {
                window.actualizarVistaMesasMozo(mesas);
            }
        } else {
            console.error('❌ Datos de mesas no son un array:', mesas);
        }
        
    } catch (error) {
        console.error('Error actualizando mesas:', error);
    }
}

// Función específica para actualizar pedidos
async function actualizarVistaPedidos() {
  try {
    // Lógica para actualizar pedidos si es necesario
    if (moduloActual === 'pedidos' && typeof window.actualizarVistaPedidos === 'function') {
      window.actualizarVistaPedidos();
    }
    
  } catch (error) {
    console.error('Error actualizando pedidos:', error);
  }
}

// ================================
// 👑 CONFIGURACIÓN ADMINISTRADOR
// ================================
async function configurarDashboardAdmin() {
  console.log("👑 Configurando dashboard para Administrador");
  ocultarModulosNoPermitidos('Administrador');
  await cargarModulo('usuarios');
}

// ================================
// 👨‍🍳 CONFIGURACIÓN COCINERO
// ================================
async function configurarDashboardCocinero() {
  console.log("👨‍🍳 Configurando dashboard para Cocinero");
  ocultarModulosNoPermitidos('Cocinero');
  await cargarModulo('cocina');
}

// ================================
// 💰 CONFIGURACIÓN CAJERO
// ================================
async function configurarDashboardCajero() {
  console.log("💰 Configurando dashboard para Cajero");
  ocultarModulosNoPermitidos('Cajero');
  await cargarModulo('caja');
}

// ================================
// 🔒 OCULTAR MÓDULOS NO PERMITIDOS
// ================================
function ocultarModulosNoPermitidos(rol) {
    const navLinks = document.querySelectorAll('.nav-link');
    const permisos = {
        'Administrador': ['usuarios', 'productos', 'mesas', 'reservas', 'auditoria', 'reportes'],
        'Mozo': ['mesas', 'pedidos', 'reservas'], 
        'Cocinero': ['cocina'],
        'Cajero': ['caja', 'pedidos']
    };

    navLinks.forEach(link => {
        const modulo = link.getAttribute('data-page');
        if (permisos[rol] && !permisos[rol].includes(modulo)) {
            link.style.display = 'none';
        } else {
            link.style.display = 'block';
            
            // Agregar badges informativos para Mozo en mesas
            if (rol === 'Mozo' && modulo === 'mesas') {
                // Remover badge anterior si existe
                const badgeAnterior = link.querySelector('.badge');
                if (badgeAnterior) badgeAnterior.remove();
                
                // Crear nuevo badge
                const badge = document.createElement('span');
                badge.className = 'badge bg-secondary ms-1';
                badge.id = 'badge-mesas';
                badge.textContent = '0/0';
                link.appendChild(badge);
            }
            
            // Agregar badge para Cocinero en cocina
            if (rol === 'Cocinero' && modulo === 'cocina') {
                const badgeAnterior = link.querySelector('.badge');
                if (badgeAnterior) badgeAnterior.remove();
                
                const badge = document.createElement('span');
                badge.className = 'badge bg-warning ms-1';
                badge.id = 'badge-cocina';
                badge.textContent = '0';
                link.appendChild(badge);
            }
        }
    });
}

// ================================
// 🚀 INICIALIZACIÓN
// ================================
document.addEventListener('DOMContentLoaded', configurarDashboardPorRol);