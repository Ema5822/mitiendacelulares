let productos = [];
let carrito = JSON.parse(localStorage.getItem(STORAGE_KEYS.carrito) || '[]');
let detalleCache = {};

const STORAGE_KEYS = {
  carrito: 'carritoCelulares',
  catalogoCache: 'catalogoCelularesCacheV2'
};

function guardarCatalogoCache(data) {
  try {
    const payload = {
      guardadoEn: new Date().toISOString(),
      total: Array.isArray(data.productos) ? data.productos.length : 0,
      productos: Array.isArray(data.productos) ? data.productos : []
    };
    localStorage.setItem(STORAGE_KEYS.catalogoCache, JSON.stringify(payload));
  } catch (e) {
    console.warn('No se pudo guardar cache local del catálogo', e);
  }
}

function leerCatalogoCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.catalogoCache);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.productos) || !data.productos.length) return null;
    return data;
  } catch (e) {
    return null;
  }
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.json();
}

function ahoraTexto() {
  const d = new Date();
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function aplicarRecargo(precio) {
  const n = Number(precio);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1.10);
}

function normalizarProducto(p) {
  return {
    ...p,
    precio: aplicarRecargo(p.precio),
    precio_original: aplicarRecargo(p.precio_original)
  };
}

async function obtenerCatalogo() {
  const cacheLocal = leerCatalogoCache();
  const intentos = [
    { url: '/.netlify/functions/celulares', tipo: 'live' },
    { url: '/api/celulares', tipo: 'live' },
    { url: './data/fallback-celulares.json', tipo: 'local' }
  ];

  let ultimoError = null;
  for (const intento of intentos) {
    try {
      const data = await fetchJSON(intento.url);
      if (Array.isArray(data) && data.length) {
        return {
          ok: true,
          tipo: cacheLocal && cacheLocal.total > data.length ? 'cache' : 'local',
          fuente: cacheLocal && cacheLocal.total > data.length ? 'Mostrando último catálogo guardado en este navegador' : 'Mostrando catálogo guardado',
          total: cacheLocal && cacheLocal.total > data.length ? cacheLocal.total : data.length,
          productos: cacheLocal && cacheLocal.total > data.length ? cacheLocal.productos : data,
          actualizado: cacheLocal && cacheLocal.total > data.length ? cacheLocal.guardadoEn : ahoraTexto()
        };
      }
      if (Array.isArray(data.productos) && data.productos.length) {
        const esLocal = data.fuente && /fallback|local/i.test(data.fuente);
        if (!esLocal) {
          guardarCatalogoCache(data);
          return {
            ...data,
            tipo: intento.tipo,
            actualizado: data.actualizado || ahoraTexto()
          };
        }
        if (cacheLocal && cacheLocal.total > data.productos.length) {
          return {
            ok: true,
            tipo: 'cache',
            fuente: 'Mostrando último catálogo guardado en este navegador',
            total: cacheLocal.total,
            productos: cacheLocal.productos,
            actualizado: cacheLocal.guardadoEn
          };
        }
        return {
          ...data,
          tipo: 'local',
          actualizado: data.actualizado || ahoraTexto()
        };
      }
    } catch (error) {
      ultimoError = error;
      console.warn('Falló la carga desde', intento.url, error);
    }
  }
  if (cacheLocal) {
    return {
      ok: true,
      tipo: 'cache',
      fuente: 'Mostrando último catálogo guardado en este navegador',
      total: cacheLocal.total,
      productos: cacheLocal.productos,
      actualizado: cacheLocal.guardadoEn
    };
  }
  throw ultimoError || new Error('No se pudo obtener el catálogo');
}

async function cargar() {
  const estado = document.getElementById('estado');
  const ultima = document.getElementById('ultimaActualizacion');
  const fuente = document.getElementById('fuenteBadge');
  try {
    const data = await obtenerCatalogo();
    productos = (Array.isArray(data.productos) ? data.productos : []).map(normalizarProducto);
    if (!productos.length) throw new Error('Sin productos');

    const esLocal = data.tipo === 'local';
    const esCache = data.tipo === 'cache';
    estado.textContent = `${productos.length} celulares encontrados`;
    ultima.textContent = `Actualizado: ${new Date(data.actualizado || Date.now()).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}`;
    fuente.textContent = esCache ? 'Catálogo guardado' : (esLocal ? 'Catálogo local' : 'Catálogo en vivo');
    fuente.className = `source-badge ${(esLocal || esCache) ? 'local' : 'live'}`;

    poblarMarcas(productos);
    render();
    actualizarCarrito();
  } catch (error) {
    estado.textContent = 'No se pudo cargar el catálogo';
    ultima.textContent = 'Verificá que Netlify publique las funciones y la carpeta data';
    fuente.textContent = 'Sin catálogo';
    fuente.className = 'source-badge local';
    document.getElementById('productos').innerHTML = '<div class="empty">No se pudo cargar el catálogo. Subí la carpeta completa a Netlify y verificá que estén las funciones y el archivo <b>data/fallback-celulares.json</b>.</div>';
    console.error(error);
  }
}

function formatoPrecio(valor) {
  return '$' + Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function poblarMarcas(lista) {
  const marcas = [''].concat([...new Set(lista.map(p => p.marca).filter(Boolean))].sort());
  const select = document.getElementById('marca');
  select.innerHTML = '<option value="">Todas las marcas</option>' + marcas.filter(Boolean).map(m => `<option value="${m}">${m}</option>`).join('');
  const chips = document.getElementById('chipsMarcas');
  chips.innerHTML = ['Todas', ...marcas.filter(Boolean)].map(m => `<button class="chip ${m === 'Todas' ? 'active' : ''}" data-marca="${m === 'Todas' ? '' : m}" onclick="seleccionarMarca('${m === 'Todas' ? '' : m}', this)">${m}</button>`).join('');
}

function seleccionarMarca(marca, btn) {
  document.getElementById('marca').value = marca;
  document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function syncChipConSelect() {
  const marca = document.getElementById('marca').value;
  document.querySelectorAll('.chip').forEach(ch => {
    ch.classList.toggle('active', ch.dataset.marca === marca || (!marca && ch.dataset.marca === ''));
  });
}

function render() {
  let lista = [...productos];
  const texto = document.getElementById('buscar').value.toLowerCase().trim();
  const marca = document.getElementById('marca').value;
  const orden = document.getElementById('orden').value;

  lista = lista.filter(p => {
    const hay = [p.nombre, p.marca, p.ram, p.almacenamiento].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(texto) && (!marca || p.marca === marca);
  });

  if (orden === 'menor') lista.sort((a,b) => Number(a.precio) - Number(b.precio));
  if (orden === 'mayor') lista.sort((a,b) => Number(b.precio) - Number(a.precio));
  if (orden === 'az') lista.sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));

  document.getElementById('estado').textContent = `${lista.length} celulares encontrados`;
  const cont = document.getElementById('productos');
  if (!lista.length) {
    cont.innerHTML = '<div class="empty">No se encontraron celulares con ese filtro.</div>';
    return;
  }

  cont.innerHTML = lista.map(p => `
    <article class="card">
      <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" onerror="this.src='https://placehold.co/600x600?text=Sin+imagen'">
      <div class="tag">${p.marca || 'Celular'}</div>
      <div class="badge-line">
        ${p.ram ? `<span class="pill">RAM ${p.ram}</span>` : ''}
        ${p.almacenamiento ? `<span class="pill">${p.almacenamiento}</span>` : ''}
      </div>
      <h3>${p.nombre}</h3>
      <p class="stock">${p.estado || 'Consultar stock'}</p>
      <div class="price-old">${p.precio_original ? formatoPrecio(p.precio_original) : ''}</div>
      <p class="precio">${formatoPrecio(p.precio)}</p>
      <div class="actions">
        <button class="primary" onclick="agregarAlCarrito(${p.id})">Agregar</button>
        <button class="ghost" onclick="verDetalle(${p.id})">Ver detalles</button>
        <a class="wa" target="_blank" rel="noopener" href="https://wa.me/5493405504914?text=${encodeURIComponent('Hola, quiero consultar por ' + p.nombre + ' - Precio: ' + formatoPrecio(p.precio))}">WhatsApp</a>
      </div>
    </article>
  `).join('');
}

async function verDetalle(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  const panel = document.getElementById('panelDetalle');
  document.getElementById('detalle').style.display = 'flex';
  panel.innerHTML = `
    <button class="close-detail" onclick="cerrarDetalle(event)">✕</button>
    <img src="${p.imagen}" alt="${p.nombre}">
    <h2>${p.nombre}</h2>
    <div class="loader">Cargando detalle del producto...</div>
  `;

  let detalle = detalleCache[p.url];
  if (!detalle && p.url) {
    const urls = [
      `/.netlify/functions/detalle?url=${encodeURIComponent(p.url)}`,
      `/api/detalle?url=${encodeURIComponent(p.url)}`
    ];
    for (const url of urls) {
      try {
        detalle = await fetchJSON(url);
        detalleCache[p.url] = detalle;
        break;
      } catch (e) {
        console.warn('No se pudo cargar el detalle desde', url, e);
      }
    }
  }

  const d = normalizarProducto({ ...p, ...(detalle || {}) });
  panel.innerHTML = `
    <button class="close-detail" onclick="cerrarDetalle(event)">✕</button>
    <img src="${d.imagen || p.imagen}" alt="${d.nombre || p.nombre}">
    <h2>${d.nombre || p.nombre}</h2>
    <p class="stock-detail">${d.estado || p.estado || 'Consultar stock'}</p>
    <div class="price-old">${d.precio_original ? formatoPrecio(d.precio_original) : ''}</div>
    <p class="precio precio-detalle">${formatoPrecio(d.precio || p.precio)}</p>
    <div class="specs">
      <p><b>Marca:</b> ${d.marca || p.marca || '-'}</p>
      <p><b>RAM:</b> ${d.ram || '-'}</p>
      <p><b>Almacenamiento:</b> ${d.almacenamiento || '-'}</p>
      <p><b>Pantalla:</b> ${d.pantalla || '-'}</p>
      <p><b>Batería:</b> ${d.bateria || '-'}</p>
      <p><b>Cámara:</b> ${d.camara || '-'}</p>
      <p><b>SKU:</b> ${d.sku || '-'}</p>
      <p><b>Descripción:</b> ${d.descripcion || 'Descripción del producto.'}</p>
    </div>
    <div class="detail-actions">
      <button class="primary" onclick="agregarAlCarrito(${p.id})">Agregar al carrito</button>
      <a class="wa" target="_blank" rel="noopener" href="https://wa.me/5493405504914?text=${encodeURIComponent('Hola, quiero comprar ' + p.nombre + ' - Precio: ' + formatoPrecio(p.precio))}">Comprar por WhatsApp</a>
      
    </div>
  `;
}

function cerrarDetalle(event) {
  if (!event || event.target.id === 'detalle' || event.target.classList.contains('close-detail')) {
    document.getElementById('detalle').style.display = 'none';
  }
}

function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;
  const item = carrito.find(p => p.id === id);
  if (item) item.cantidad += 1;
  else carrito.push({ ...producto, cantidad: 1 });
  guardarCarrito();
  actualizarCarrito();
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(p => p.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter(p => p.id !== id);
  guardarCarrito();
  actualizarCarrito();
}

function quitarItem(id) {
  carrito = carrito.filter(p => p.id !== id);
  guardarCarrito();
  actualizarCarrito();
}

function guardarCarrito() {
  localStorage.setItem(STORAGE_KEYS.carrito, JSON.stringify(carrito));
}

function actualizarCarrito() {
  const count = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const total = carrito.reduce((acc, item) => acc + Number(item.precio) * item.cantidad, 0);
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = formatoPrecio(total);
  const lista = document.getElementById('listaCarrito');
  if (!carrito.length) {
    lista.innerHTML = '<p class="empty-cart">Tu carrito está vacío.</p>';
    return;
  }
  lista.innerHTML = carrito.map(item => `
    <div class="cart-item">
      <div>
        <strong>${item.nombre}</strong>
        <p>${item.marca || 'Celular'} · ${formatoPrecio(item.precio)}</p>
      </div>
      <div class="qty">
        <button onclick="cambiarCantidad(${item.id}, -1)">-</button>
        <span>${item.cantidad}</span>
        <button onclick="cambiarCantidad(${item.id}, 1)">+</button>
      </div>
      <button class="remove" onclick="quitarItem(${item.id})">Eliminar</button>
    </div>
  `).join('');
}

function abrirCarrito() {
  document.getElementById('carritoPanel').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}
function cerrarCarrito() {
  document.getElementById('carritoPanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}
function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  actualizarCarrito();
}
function comprarWhatsApp() {
  if (!carrito.length) return alert('Tu carrito está vacío');
  const total = carrito.reduce((acc, item) => acc + Number(item.precio) * item.cantidad, 0);
  let texto = 'Hola, quiero hacer este pedido:%0A%0A';
  carrito.forEach(item => texto += `• ${item.nombre} x${item.cantidad} - ${formatoPrecio(Number(item.precio) * item.cantidad)}%0A`);
  texto += `%0ATotal: ${formatoPrecio(total)}`;
  window.open('https://wa.me/5493405504914?text=' + texto, '_blank');
}

document.getElementById('buscar').addEventListener('input', render);
document.getElementById('marca').addEventListener('change', () => { syncChipConSelect(); render(); });
document.getElementById('orden').addEventListener('change', render);

cargar();
