const cheerio = require('cheerio');

const BASE = 'https://www.evophone.com.ar';
const CATEGORY_URLS = [
  'https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/?per_row=4&shop_view=grid&per_page=72',
  'https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/2/?per_row=4&shop_view=grid&per_page=72'
];

function limpiarTexto(texto = '') {
  return texto.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
}

function slugify(texto = '') {
  return limpiarTexto(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferirMarca(nombre = '') {
  const base = nombre.toLowerCase();
  if (base.includes('samsung')) return 'Samsung';
  if (base.includes('moto') || base.includes('motorola')) return 'Motorola';
  if (base.includes('xiaomi') || base.includes('redmi') || base.includes('poco')) return 'Xiaomi';
  if (base.includes('realme')) return 'Realme';
  return 'Otros';
}

function extraerPrecio(texto = '') {
  const candidatos = [...texto.matchAll(/\$\s*([\d.]+(?:,\d{2})?)/g)].map(m => m[1]);
  const bruto = candidatos.length ? candidatos[candidatos.length - 1] : '';
  const normalizado = bruto.replace(/\./g, '').replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero) : 0;
}

async function getHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; NetlifyBot/1.0)',
      'accept-language': 'es-AR,es;q=0.9,en;q=0.8'
    }
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener ${url} (${response.status})`);
  }
  return await response.text();
}

function extraerTarjetas(html) {
  const $ = cheerio.load(html);
  const productos = [];
  const vistos = new Set();

  $('a[href*="/producto/"]').each((_, el) => {
    const href = $(el).attr('href');
    const title = limpiarTexto($(el).text() || $(el).attr('title') || '');
    if (!href || !title || title.length < 8 || vistos.has(href)) return;
    const card = $(el).closest('li, .product, .wd-product, article, .product-grid-item, .wd-products-holder > div');
    const textoCard = limpiarTexto(card.text());
    const agotado = /agotado/i.test(textoCard);
    const precio = extraerPrecio(textoCard);
    vistos.add(href);
    productos.push({
      nombre: title,
      marca: inferirMarca(title),
      precio,
      agotado,
      productoUrl: href.startsWith('http') ? href : `${BASE}${href}`
    });
  });

  return productos;
}

function extraerImagen($) {
  const candidatos = [
    'meta[property="og:image"]',
    '.woocommerce-product-gallery__image a',
    '.woocommerce-product-gallery__image img',
    '.product-image-wrap img',
    'figure img'
  ];
  for (const sel of candidatos) {
    const el = $(sel).first();
    const url = el.attr('content') || el.attr('href') || el.attr('src') || el.attr('data-large_image') || el.attr('data-src');
    if (url && /^https?:/i.test(url)) return url;
  }
  return '';
}

function extraerStock(html, $) {
  const texto = limpiarTexto($.text());
  const scriptHit = html.match(/"stock_quantity"\s*:\s*(\d+)/i) || html.match(/"max_qty"\s*:\s*(\d+)/i);
  if (scriptHit) {
    const stock = Number(scriptHit[1]);
    return { stock, stockTexto: stock > 0 ? `En stock: ${stock} disponibles` : 'Sin stock', agotado: stock <= 0 };
  }

  const maxInput = $('input.qty[max]').first().attr('max');
  if (maxInput && /^\d+$/.test(maxInput)) {
    const stock = Number(maxInput);
    return { stock, stockTexto: stock > 0 ? `En stock: ${stock} disponibles` : 'Sin stock', agotado: stock <= 0 };
  }

  if (/agotado/i.test(texto)) {
    return { stock: 0, stockTexto: 'Sin stock', agotado: true };
  }
  if (/hay existencias/i.test(texto)) {
    return { stock: null, stockTexto: 'Disponible', agotado: false };
  }
  if (/solo est[aá] disponible para retiro local/i.test(texto)) {
    return { stock: null, stockTexto: 'Disponible para retiro local', agotado: false };
  }

  return { stock: null, stockTexto: 'Disponible', agotado: false };
}

function extraerSpecs($, nombre) {
  const texto = limpiarTexto($.text());
  const ram = nombre.match(/(\d+)GB\s*RAM/i)?.[1] ? `${nombre.match(/(\d+)GB\s*RAM/i)[1]}GB` : 'No informado';
  const almacenamiento = nombre.match(/RAM\s*(\d+)GB/i)?.[1] ? `${nombre.match(/RAM\s*(\d+)GB/i)[1]}GB` : (nombre.match(/(\d+)GB(?!\s*RAM)/i)?.[1] ? `${nombre.match(/(\d+)GB(?!\s*RAM)/i)[1]}GB` : 'No informado');
  const pantalla = texto.match(/pantalla[^\d]*(\d+(?:[.,]\d+)?\s*["”])/i)?.[1]?.replace(',', '.') || 'No informado';
  const bateria = texto.match(/bater[ií]a[^\d]*(\d{4,5}\s*mAh)/i)?.[1] || 'No informado';
  const camara = texto.match(/c[aá]mara[^\d]*(\d+\s*MP(?:[^\n.]*)?)/i)?.[1] || 'No informado';
  return { ram, almacenamiento, pantalla, bateria, camara };
}

async function enriquecerProducto(producto, id) {
  try {
    const html = await getHtml(producto.productoUrl);
    const $ = cheerio.load(html);
    const imagen = extraerImagen($);
    const stockInfo = extraerStock(html, $);
    const specs = extraerSpecs($, producto.nombre);
    return {
      id,
      ...producto,
      ...specs,
      ...stockInfo,
      imagen,
      origen: 'Evophone'
    };
  } catch (error) {
    return {
      id,
      ...producto,
      ram: 'No informado',
      almacenamiento: 'No informado',
      pantalla: 'No informado',
      bateria: 'No informado',
      camara: 'No informado',
      stock: producto.agotado ? 0 : null,
      stockTexto: producto.agotado ? 'Sin stock' : 'Disponible',
      imagen: '',
      origen: 'Evophone'
    };
  }
}

exports.handler = async () => {
  try {
    const htmls = await Promise.all(CATEGORY_URLS.map(getHtml));
    const mapa = new Map();

    for (const html of htmls) {
      for (const producto of extraerTarjetas(html)) {
        mapa.set(slugify(producto.nombre), producto);
      }
    }

    const base = [...mapa.values()];
    const detallados = [];
    for (let i = 0; i < base.length; i += 6) {
      const lote = base.slice(i, i + 6);
      const parcial = await Promise.all(lote.map((p, idx) => enriquecerProducto(p, i + idx + 1)));
      detallados.push(...parcial);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=900'
      },
      body: JSON.stringify({
        actualizado: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
        total: detallados.length,
        productos: detallados
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'No se pudo obtener celulares', detalle: error.message })
    };
  }
};
