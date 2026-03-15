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
  return [
    `${base}/?per_page=72&per_row=4&shop_view=grid`,
    `${base}/page/2/?per_page=72&per_row=4&shop_view=grid`,
    `${base}/`,
    `${base}/page/2/`,
    `${base}/page/3/`,
    `${base}/page/4/`,
    `${base}/page/5/`
  ];
}

exports.handler = async () => {
  try {
    const urls = buildCatalogUrls();
    let productos = [];
    const diagnostico = [];

    for (const url of urls) {
      try {
        const res = await request(url);
        if (res.status && res.status < 400) {
          const parsed = parseProducts(res.data);
          diagnostico.push({ url, status: res.status, encontrados: parsed.length });
          if (parsed.length) productos.push(...parsed);
        } else {
          diagnostico.push({ url, status: res.status || 0, encontrados: 0 });
        }
      } catch (e) {
        diagnostico.push({ url, status: 'error', encontrados: 0 });
      }
    }

    const map = new Map();
    for (const p of productos) map.set(p.url || p.nombre, p);
    productos = [...map.values()].filter(p => p.nombre && p.precio).map((p, i) => ({ ...p, id: i + 1 }));

    if (productos.length < 20) throw new Error('Evophone devolvió muy pocos productos');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
      body: JSON.stringify({
        ok: true,
        fuente: 'Catálogo en vivo desde Evophone · actualización cada 30 min',
        total: productos.length,
        productos,
        actualizado: new Date().toISOString(),
        diagnostico
      })
    };
  } catch (error) {
    const fallback = loadFallback();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({
        ok: true,
        fuente: 'Fallback local incluido en Netlify',
        total: fallback.length,
        productos: fallback,
        warning: error.message,
        actualizado: new Date().toISOString()
      })
    };
  }
};
