const https = require('https');

function request(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function stripTags(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(text = '') {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#215;/g, 'x')
    .replace(/&#8243;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parsePrice(text = '') {
  const clean = text.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  return clean ? Number(clean) : null;
}

function normalizeSpace(text = '') {
  return decodeEntities(stripTags(text)).replace(/\s+/g, ' ').trim();
}

function inferBrand(name = '') {
  const n = name.toLowerCase();
  if (n.includes('samsung')) return 'Samsung';
  if (n.includes('moto') || n.includes('motorola')) return 'Motorola';
  if (n.includes('xiaomi') || n.includes('redmi') || n.includes('poco')) return 'Xiaomi';
  if (n.includes('realme')) return 'Realme';
  return 'Otros';
}

function inferField(name = '', regex) {
  const match = name.match(regex);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

module.exports = { request, stripTags, decodeEntities, parsePrice, normalizeSpace, inferBrand, inferField };
