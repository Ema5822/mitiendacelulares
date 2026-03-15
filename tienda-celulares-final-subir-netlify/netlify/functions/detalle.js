const { request, parsePrice, normalizeSpace, inferBrand } = require('./utils');

function getImage(html = '') {
  const m = html.match(/class="[^"]*wp-post-image[^"]*"[^>]+(?:data-lazy-src|data-src|src)="([^"]+)"/i)
    || html.match(/<figure[\s\S]*?<img[^>]+(?:data-lazy-src|data-src|src)="([^"]+)"/i)
    || html.match(/<img[^>]+(?:data-lazy-src|data-src|src)="([^"]+)"/i);
  return m ? m[1] : '';
}

function pickTextByLabel(section, label) {
  const regex = new RegExp(label + '[\s\S]{0,80}?<td[^>]*>([\s\S]*?)<\/td>', 'i');
  const m = section.match(regex);
  return m ? normalizeSpace(m[1]) : '';
}

exports.handler = async (event) => {
  try {
    const url = event.queryStringParameters && event.queryStringParameters.url;
    if (!url) return { statusCode: 400, body: JSON.stringify({ error: 'Falta url' }) };
    const res = await request(url);
    if (!res.status || res.status >= 400) throw new Error('No se pudo abrir el producto');
    const html = res.data;
    const title = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
    const amounts = [...html.matchAll(/woocommerce-Price-amount[^>]*>\s*(?:<bdi>)?([^<]+)/g)].map(m => parsePrice(m[1])).filter(Boolean);
    const oldPrice = html.match(/<del[\s\S]*?woocommerce-Price-amount[^>]*>\s*(?:<bdi>)?([^<]+)/i);
    const sku = html.match(/SKU:\s*<span[^>]*>([\s\S]*?)<\/span>/i) || html.match(/SKU:\s*([^<]+)/i);
    const description = html.match(/<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/<div[^>]*id="tab-description"[^>]*>([\s\S]*?)<\/div>/i);
    const infoTable = html.match(/<table[^>]*class="[^"]*shop_attributes[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    const whole = html;
    const nombre = title ? normalizeSpace(title[1]) : '';
    const detalle = {
      nombre,
      marca: inferBrand(nombre),
      precio: amounts[amounts.length - 1] || null,
      precio_original: oldPrice ? parsePrice(oldPrice[1]) : null,
      imagen: getImage(html),
      sku: sku ? normalizeSpace(sku[1]) : '',
      descripcion: description ? normalizeSpace(description[1]).slice(0, 400) : '',
      estado: /agotado/i.test(html) ? 'Agotado' : (/retiro local/i.test(html) ? 'Retiro local · consultar stock' : 'Consultar stock'),
      ram: '',
      almacenamiento: '',
      pantalla: '',
      bateria: '',
      camara: ''
    };
    if (infoTable) {
      const table = infoTable[1];
      detalle.ram = pickTextByLabel(table, 'RAM|Memoria RAM') || detalle.ram;
      detalle.almacenamiento = pickTextByLabel(table, 'Almacenamiento|ROM|Memoria interna') || detalle.almacenamiento;
      detalle.pantalla = pickTextByLabel(table, 'Pantalla') || detalle.pantalla;
      detalle.bateria = pickTextByLabel(table, 'Bater[ií]a') || detalle.bateria;
      detalle.camara = pickTextByLabel(table, 'C[aá]mara') || detalle.camara;
    }
    if (!detalle.ram) {
      const ram = nombre.match(/(\d+\s*GB\s*RAM)/i);
      if (ram) detalle.ram = ram[1];
    }
    if (!detalle.almacenamiento) {
      const alm = nombre.match(/(\d+\s*GB)(?!\s*RAM)/i);
      if (alm) detalle.almacenamiento = alm[1];
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800' }, body: JSON.stringify(detalle) };
  } catch (error) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ descripcion: 'No se pudo leer el detalle en este momento.' }) };
  }
};
