const state = {
  products: [],
  filtered: []
};

const elements = {
  grid: document.getElementById('productsGrid'),
  template: document.getElementById('productTemplate'),
  search: document.getElementById('searchInput'),
  brand: document.getElementById('brandFilter'),
  sort: document.getElementById('sortFilter'),
  total: document.getElementById('totalCount'),
  lastUpdate: document.getElementById('lastUpdate'),
  status: document.getElementById('statusBadge'),
  refresh: document.getElementById('refreshBtn'),
  error: document.getElementById('errorBox'),
  empty: document.getElementById('emptyState')
};

function formatCurrency(value) {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(value);
}

function normalizeText(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function relativeMeta(product) {
  const bits = [];
  if (product.memory) bits.push(product.memory);
  if (product.color) bits.push(product.color);
  if (product.discountText) bits.push(product.discountText);
  return bits.join(' • ');
}

function buildWhatsAppLink(product) {
  const text = encodeURIComponent(`Hola, quiero consultar por ${product.name}`);
  return `https://wa.me/543405504914?text=${text}`;
}

function renderProducts() {
  elements.grid.innerHTML = '';
  elements.empty.classList.toggle('hidden', state.filtered.length > 0);
  elements.total.textContent = state.filtered.length.toString();

  const fragment = document.createDocumentFragment();

  for (const product of state.filtered) {
    const node = elements.template.content.cloneNode(true);
    const img = node.querySelector('.card-image');
    const stock = node.querySelector('.card-stock');
    const brand = node.querySelector('.card-brand');
    const title = node.querySelector('.card-title');
    const oldPrice = node.querySelector('.old-price');
    const price = node.querySelector('.price');
    const meta = node.querySelector('.card-meta');
    const productLink = node.querySelector('.product-link');
    const whatsappLink = node.querySelector('.whatsapp-link');

    img.src = product.image || 'https://placehold.co/600x600?text=Celular';
    img.alt = product.name;
    img.referrerPolicy = 'no-referrer';

    stock.textContent = product.inStock ? 'Disponible' : 'Agotado';
    stock.classList.toggle('agotado', !product.inStock);

    brand.textContent = product.brand || 'Celular';
    title.textContent = product.name;
    oldPrice.textContent = product.oldPrice ? formatCurrency(product.oldPrice) : '';
    price.textContent = formatCurrency(product.priceValue) || product.priceText || 'Consultar';
    meta.textContent = relativeMeta(product);

    productLink.href = product.url;
    whatsappLink.href = buildWhatsAppLink(product);

    fragment.appendChild(node);
  }

  elements.grid.appendChild(fragment);
}

function fillBrandOptions(products) {
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();
  elements.brand.innerHTML = '<option value="">Todas las marcas</option>';
  brands.forEach((brand) => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    elements.brand.appendChild(option);
  });
}

function applyFilters() {
  const query = normalizeText(elements.search.value);
  const selectedBrand = normalizeText(elements.brand.value);
  const sort = elements.sort.value;

  let filtered = state.products.filter((product) => {
    const haystack = normalizeText([
      product.name,
      product.brand,
      product.color,
      product.memory,
      product.priceText
    ].join(' '));

    const matchesQuery = !query || haystack.includes(query);
    const matchesBrand = !selectedBrand || normalizeText(product.brand) === selectedBrand;
    return matchesQuery && matchesBrand;
  });

  switch (sort) {
    case 'price-asc':
      filtered.sort((a, b) => (a.priceValue ?? Number.MAX_SAFE_INTEGER) - (b.priceValue ?? Number.MAX_SAFE_INTEGER));
      break;
    case 'price-desc':
      filtered.sort((a, b) => (b.priceValue ?? 0) - (a.priceValue ?? 0));
      break;
    case 'name-asc':
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      break;
    default:
      filtered.sort((a, b) => Number(b.inStock) - Number(a.inStock));
      break;
  }

  state.filtered = filtered;
  renderProducts();
}

async function loadProducts(showManualState = false) {
  try {
    elements.error.classList.add('hidden');
    elements.status.textContent = showManualState ? 'Actualizando catálogo…' : 'Cargando catálogo…';

    const response = await fetch(`/api/celulares?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    state.products = Array.isArray(data.products) ? data.products : [];

    fillBrandOptions(state.products);
    applyFilters();

    const updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    elements.lastUpdate.textContent = updatedAt.toLocaleString('es-AR');
    elements.status.textContent = `Catálogo activo · ${state.products.length} celulares`;
  } catch (error) {
    console.error(error);
    elements.error.textContent = 'Error cargando celulares. Revisá la función de Netlify o el acceso al sitio origen.';
    elements.error.classList.remove('hidden');
    elements.status.textContent = 'No se pudo actualizar';
  }
}

elements.search.addEventListener('input', applyFilters);
elements.brand.addEventListener('change', applyFilters);
elements.sort.addEventListener('change', applyFilters);
elements.refresh.addEventListener('click', () => loadProducts(true));

loadProducts();
setInterval(() => loadProducts(), 30 * 60 * 1000);
