const fs = require('fs');
const path = require('path');
const { request, parsePrice, normalizeSpace, inferBrand, inferField } = require('./utils');

function getImage(tag = '') {
  const attrs = ['data-lazy-src', 'data-src', 'src'];
  for (const attr of attrs) {
    const m = tag.match(new RegExp(attr + '="([^"]+)"'));
    if (m) return m[1];
  }
  const srcset = tag.match(/srcset="([^"]+)"/);
  if (srcset) return srcset[1].split(',')[0].trim().split(' ')[0];
  return 'https://placehold.co/600x600?text=Sin+imagen';
}

function parseProducts(html) {
  const items = [];
  const blocks = html.match(/<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];
  let id = 1;
  for (const block of blocks) {
    const title = block.match(/<h[23][^>]*class="[^"]*(?:woocommerce-loop-product__title|wd-entities-title)[^"]*"[^>]*>([\s\S]*?)<\/h[23]>/i)
      || block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
    const name = title ? normalizeSpace(title[1]) : '';
    if (!name) continue;
    const link = block.match(/<a[^>]+href="([^"]+)"/i);
    const img = block.match(/<img[^>]*>/i);
    const amounts = [...block.matchAll(/woocommerce-Price-amount[^>]*>\s*(?:<bdi>)?([^<]+)/g)].map(m => parsePrice(m[1])).filter(Boolean);
    const oldPrice = block.match(/<del[\s\S]*?woocommerce-Price-amount[^>]*>\s*(?:<bdi>)?([^<]+)/i);
    items.push({
      id: id++,
      nombre: name,
      marca: inferBrand(name),
      precio: amounts[amounts.length - 1] || null,
      precio_original: oldPrice ? parsePrice(oldPrice[1]) : null,
      ram: inferField(name, /(\d+\s*GB(?:\s*RAM)?)/i),
      almacenamiento: inferField(name, /(\d+\s*GB)(?!\s*RAM)/i),
      imagen: img ? getImage(img[0]) : 'https://placehold.co/600x600?text=Sin+imagen',
      url: link ? link[1] : '',
      estado: /agotado/i.test(block) ? 'Agotado' : 'Consultar stock'
    });
  }
  const dedup = new Map();
  for (const p of items) if (!dedup.has(p.url || p.nombre)) dedup.set(p.url || p.nombre, p);
  return [...dedup.values()].map((p, i) => ({ ...p, id: i + 1 }));
}

function loadFallback() {
  const fallbackPath = path.join(__dirname, '..', '..', 'data', 'fallback-celulares.json');
  return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
}

function buildCatalogUrls() {
  const base = 'https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares';
  const urls = [];
  for (let page = 1; page <= 5; page++) {
    urls.push(`${base}/page/${page}/?per_row=4&shop_view=grid&per_page=72`);
    urls.push(`${base}/page/${page}/`);
  }
  urls.push(`${base}/?per_row=4&shop_view=grid&per_page=72`);
  urls.push(`${base}/`);
  return [...new Set(urls)];
}

exports.handler = async () => {
  try {
    const urls = buildCatalogUrls();
    let productos = [];
    for (const url of urls) {
      try {
        const res = await request(url);
        if (res.status && res.status < 400) {
          const parsed = parseProducts(res.data);
          if (parsed.length) productos.push(...parsed);
        }
      } catch (e) {
        // sigue con la siguiente url
      }
    }
    const map = new Map();
    for (const p of productos) map.set(p.url || p.nombre, p);
    productos = [...map.values()].filter(p => p.nombre && p.precio).map((p, i) => ({ ...p, id: i + 1 }));
    if (!productos.length) throw new Error('Evophone no devolvió productos parseables');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
      body: JSON.stringify({ ok: true, fuente: 'Catálogo en vivo desde Evophone · actualización cada 30 min', total: productos.length, productos })
    };
  } catch (error) {
    const fallback = loadFallback();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({ ok: true, fuente: 'Fallback local incluido en Netlify', total: fallback.length, productos: fallback, warning: error.message })
    };
  }
};
