function initModuloProductos() {
    console.log("🍽️ Módulo Productos iniciado.");

    // Referencias a elementos
    const formProducto = document.getElementById('formProducto');
    const tablaBody = document.getElementById('tablaProductosBody');
    const msgCrear = document.getElementById('msgCrearProducto');
    const btnCrearActualizar = document.getElementById('btnCrearActualizarProducto');
    const tituloForm = document.getElementById('tituloFormProducto');

    // Variables de estado
    let editandoProductoId = null;
    const apiURL = "http://localhost:4000/api/productos";

    // Verificar autenticación y rol
    (async () => {
        try {
            const res = await fetch('http://localhost:4000/api/usuarios/me', { credentials: 'include' });
            if (!res.ok) throw new Error('No estás logueado');
            const data = await res.json();

            if (data.usuario.rol !== 'Administrador') {
                alert('Solo administradores pueden gestionar productos');
                window.location.href = '/dashboard.html';
                return;
            }

            await cargarProductos();
        } catch (err) {
            console.error(err);
            alert('Debes iniciar sesión');
            window.location.href = '/login.html';
        }
    })();

    // Cargar productos
    async function cargarProductos() {
        try {
            const res = await fetch(apiURL, { 
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`);
            }
            
            const productos = await res.json();

            if (!Array.isArray(productos)) {
                throw new Error('Formato de datos inválido');
            }

            if (productos.length === 0) {
                tablaBody.innerHTML = '<tr><td colspan="8" class="text-center">No hay productos registrados</td></tr>';
                return;
            }

            tablaBody.innerHTML = productos.map(producto => `
                <tr>
                    <td>${producto.nombre}</td>
                    <td>${producto.descripcion || '-'}</td>
                    <td>S/ ${producto.precio ? producto.precio.toFixed(2) : '0.00'}</td>
                    <td>${producto.tiempoAprox || 0} min</td>
                    <td>${producto.stock || 0}</td>
                    <td>${producto.categoria}</td>
                    <td>
                        <span class="badge ${producto.estado === 'activo' ? 'bg-success' : 'bg-danger'}">
                            ${producto.estado || 'activo'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="editarProducto('${producto._id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto('${producto._id}')">
                            🗑️ Eliminar
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (err) {
            console.error('Error al cargar productos:', err);
            if (tablaBody) {
                tablaBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error de conexión</td></tr>';
            }
        }
    }

    //  Crear o actualizar producto
    formProducto.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msgCrear) msgCrear.textContent = '';

        const productoData = {
            nombre: document.getElementById('nombreProducto').value.trim(),
            descripcion: document.getElementById('descripcionProducto').value.trim(),
            precio: parseFloat(document.getElementById('precioProducto').value),
            tiempoAprox: parseInt(document.getElementById('tiempoProducto').value),
            stock: parseInt(document.getElementById('stockProducto').value),
            categoria: document.getElementById('categoriaProducto').value.trim(),
            estado: document.getElementById('estadoProducto').value
        };

        // Validaciones frontend
        if (!productoData.nombre || !productoData.precio || !productoData.categoria) {
            if (msgCrear) {
                msgCrear.textContent = ' Nombre, precio y categoría son obligatorios';
                msgCrear.className = 'msg text-danger';
            }
            return;
        }

        try {
            let res;
            let url = apiURL;
            let method = 'POST';

            if (editandoProductoId) {
                // Actualizar producto existente
                url = `${apiURL}/${editandoProductoId}`;
                method = 'PUT';
            }

            console.log(`📤 Enviando ${method} a: ${url}`, productoData);

            res = await fetch(url, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(productoData)
            });

            // Verificar si la respuesta es JSON
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await res.text();
                console.error('Respuesta no JSON:', textResponse);
                throw new Error('El servidor respondió con un formato incorrecto');
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.mensaje || `Error ${res.status} al ${editandoProductoId ? 'actualizar' : 'crear'} producto`);
            }

            // Éxito
            if (msgCrear) {
                msgCrear.textContent = editandoProductoId ? ' Producto actualizado' : ' Producto creado';
                msgCrear.className = 'msg text-success';
            }

            // Resetear formulario y recargar tabla
            formProducto.reset();
            resetearFormulario();
            await cargarProductos();

        } catch (err) {
            console.error('Error al guardar producto:', err);
            if (msgCrear) {
                msgCrear.textContent = err.message;
                msgCrear.className = 'msg text-danger';
            }
        }
    });

    // ✏️ Editar producto - VERSIÓN CORREGIDA
    window.editarProducto = async (id) => {
        try {
            console.log(`Editando producto: ${id}`);
            
            const res = await fetch(`${apiURL}/${id}`, { 
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('Producto no encontrado. Puede que haya sido eliminado.');
                }
                throw new Error(`Error ${res.status}: ${res.statusText}`);
            }

            // Verificar si es JSON
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await res.text();
                console.error('Respuesta no JSON:', textResponse);
                throw new Error('El servidor respondió con un formato incorrecto');
            }

            const producto = await res.json();

            // Validar que el producto tiene los datos necesarios
            if (!producto || !producto._id) {
                throw new Error('Datos del producto incompletos');
            }

            console.log('Producto cargado para edición:', producto.nombre);

            // Llenar formulario con datos del producto
            document.getElementById('productoIdEditar').value = producto._id;
            document.getElementById('nombreProducto').value = producto.nombre || '';
            document.getElementById('descripcionProducto').value = producto.descripcion || '';
            document.getElementById('precioProducto').value = producto.precio || '';
            document.getElementById('tiempoProducto').value = producto.tiempoAprox || '';
            document.getElementById('stockProducto').value = producto.stock || '';
            document.getElementById('categoriaProducto').value = producto.categoria || '';
            document.getElementById('estadoProducto').value = producto.estado || 'activo';

            // Cambiar interfaz a modo edición
            if (btnCrearActualizar) btnCrearActualizar.textContent = 'Actualizar';
            if (tituloForm) tituloForm.textContent = '✏️ Editar Producto';
            editandoProductoId = id;

            // Scroll al formulario
            formProducto.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error('Error al editar producto:', err);
            alert('Error al cargar producto: ' + err.message);
            
            // Recargar la lista de productos por si el producto fue eliminado
            await cargarProductos();
        }
    };

    // Eliminar producto
    window.eliminarProducto = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            const res = await fetch(`${apiURL}/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Verificar si es JSON
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await res.text();
                console.error('Respuesta no JSON:', textResponse);
                throw new Error('El servidor respondió con un formato incorrecto');
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.mensaje || 'Error al eliminar producto');
            }

            alert('Producto eliminado correctamente');
            await cargarProductos();

        } catch (err) {
            console.error('Error al eliminar producto:', err);
            alert('Error: ' + err.message);
        }
    };

    //Resetear formulario
    function resetearFormulario() {
        formProducto.reset();
        document.getElementById('productoIdEditar').value = '';
        if (btnCrearActualizar) btnCrearActualizar.textContent = 'Crear';
        if (tituloForm) tituloForm.textContent = '➕ Crear Producto';
        editandoProductoId = null;
        if (msgCrear) msgCrear.textContent = '';
    }
}