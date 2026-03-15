const fs = require('fs');
const path = require('path');
const { request, parsePrice, normalizeSpace, inferBrand, inferField } = require('./utils');

function getImage(tag = '') {
  const attrs = ['data-lazy-src', 'data-src', 'src'];
  for (const attr of attrs) {
    const m = tag.match(new RegExp(attr + '=\"([^\"]+)\"'));
    if (m) return m[1];
  }
  const srcset = tag.match(/srcset="([^"]+)"/);
  if (srcset) {
    return srcset[1].split(',')[0].trim().split(' ')[0];
  }
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
    if (!name || !/celular/i.test(name)) continue;
    const link = block.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*(?:woocommerce-LoopProduct-link|product-image-link|product-title-link)?[^"]*"/i)
      || block.match(/<a[^>]+href="([^"]+)"/i);
    const img = block.match(/<img[^>]*>/i);
    const amounts = [...block.matchAll(/woocommerce-Price-amount[^>]*>\s*(?:<bdi>)?([^<]+)/g)].map(m => parsePrice(m[1])).filter(Boolean);
    const oldPrice = block.match(/<del[\s\S]*?woocommerce-Price-amount[^>]*>\s*(?:<bdi>)?([^<]+)/i);
    const stock = /agotado/i.test(block) ? 'Agotado' : 'Consultar stock';
    items.push({
      id: id++,
      nombre: name,
      marca: inferBrand(name),
      precio: amounts[amounts.length - 1] || null,
      precio_original: oldPrice ? parsePrice(oldPrice[1]) : null,
      ram: inferField(name, /(\d+\s*GB\s*RAM)/i),
      almacenamiento: inferField(name, /(\d+\s*GB)(?!\s*RAM)/i),
      imagen: img ? getImage(img[0]) : 'https://placehold.co/600x600?text=Sin+imagen',
      url: link ? link[1] : '',
      estado: stock
    });
  }
  const dedup = new Map();
  for (const p of items) {
    if (!dedup.has(p.url || p.nombre)) dedup.set(p.url || p.nombre, p);
  }
  return [...dedup.values()].map((p, i) => ({ ...p, id: i + 1 }));
}

exports.handler = async () => {
  try {
    const urls = [
      'https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/1/?per_row=4&shop_view=grid&per_page=72',
      'https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/2/?per_row=4&shop_view=grid&per_page=72'
    ];
    let productos = [];
    for (const url of urls) {
      const res = await request(url);
      if (res.status && res.status < 400) productos.push(...parseProducts(res.data));
    }
    const map = new Map();
    for (const p of productos) map.set(p.url || p.nombre, p);
    productos = [...map.values()].map((p, i) => ({ ...p, id: i + 1 }));
    if (!productos.length) throw new Error('Scraping vacío');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
      body: JSON.stringify({
        ok: true,
        fuente: 'Catálogo en vivo desde Evophone · actualización cada 30 min',
        total: productos.length,
        productos
      })
    };
  } catch (error) {
    const fallbackPath = path.join(__dirname, '..', '..', 'data', 'fallback-celulares.json');
    const fallback = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        ok: true,
        fuente: 'Fallback local porque Evophone bloqueó o no respondió',
        total: fallback.length,
        productos: fallback,
        warning: error.message
      })
    };
  }
};
