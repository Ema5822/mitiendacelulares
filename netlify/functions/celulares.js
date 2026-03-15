const cheerio = require('cheerio');

const SOURCE_URLS = [
  'https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/?per_page=72&per_row=4&shop_view=grid',
  'https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/2/?per_page=72&per_row=4&shop_view=grid'
];

let cache = {
  updatedAt: 0,
  payload: null
};

const CACHE_MS = 30 * 60 * 1000;

function parsePrice(value) {
  if (!value) return null;
  const numeric = value
    .replace(/\s/g, '')
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractBrand(name = '') {
  const lowered = name.toLowerCase();
  if (lowered.includes('motorola') || lowered.includes('moto ')) return 'Motorola';
  if (lowered.includes('samsung')) return 'Samsung';
  if (lowered.includes('xiaomi') || lowered.includes('redmi')) return 'Xiaomi';
  if (lowered.includes('realme')) return 'Realme';
  return 'Otros';
}

function extractMemory(name = '') {
  const match = name.match(/(\d+\s*GB\s*RAM\s*\d+\s*GB|\d+\s*GB\s*RAM|\d+\s*GB)/i);
  return match ? match[0].replace(/\s+/g, ' ').trim() : '';
}

function extractColor(name = '') {
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(' ');
  return parts.slice(-2).join(' ');
}

function normalizeUrl(url = '') {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `https://www.evophone.com.ar${url}`;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NetlifyBot/1.0; +https://www.netlify.com/)'
    }
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener ${url} (${response.status})`);
  }

  return response.text();
}

function scrapeProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $('li.product').each((_, element) => {
    const card = $(element);
    const link = card.find('a.woocommerce-LoopProduct-link, a.woocommerce-loop-product__link').first();
    const image = card.find('img').first();
    const title = card.find('h2, h3, .woocommerce-loop-product__title').first().text().trim();
    const priceWholeText = card.find('.price').first().text().replace(/\s+/g, ' ').trim();
    const currentPriceText = card.find('.price ins .amount, .price .amount').last().text().trim();
    const oldPriceText = card.find('.price del .amount').first().text().trim();
    const badgeText = card.find('.onsale, .wd-onsale, .out-of-stock, .stock').first().text().replace(/\s+/g, ' ').trim();
    const href = normalizeUrl(link.attr('href'));
    const imageUrl = normalizeUrl(image.attr('data-src') || image.attr('data-lazy-src') || image.attr('src') || image.attr('srcset')?.split(' ')[0] || '');
    const stockText = card.text().toLowerCase();

    if (!title || !href) return;

    const currentPrice = parsePrice(currentPriceText || priceWholeText);
    const oldPrice = parsePrice(oldPriceText);
    const inStock = !stockText.includes('agotado') && !badgeText.toLowerCase().includes('agotado');

    products.push({
      id: href,
      name: title,
      brand: extractBrand(title),
      memory: extractMemory(title),
      color: extractColor(title),
      url: href,
      image: imageUrl,
      priceText: currentPriceText || priceWholeText,
      priceValue: currentPrice,
      oldPrice,
      inStock,
      discountText: badgeText || ''
    });
  });

  return products;
}

exports.handler = async () => {
  try {
    if (cache.payload && Date.now() - cache.updatedAt < CACHE_MS) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=1800'
        },
        body: JSON.stringify(cache.payload)
      };
    }

    const htmlPages = await Promise.all(SOURCE_URLS.map(fetchHtml));
    const products = htmlPages.flatMap(scrapeProducts);

    const deduped = Array.from(new Map(products.map((item) => [item.id, item])).values());

    const payload = {
      source: 'Evophone',
      total: deduped.length,
      updatedAt: new Date().toISOString(),
      products: deduped
    };

    cache = {
      updatedAt: Date.now(),
      payload
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800'
      },
      body: JSON.stringify(payload)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        error: 'No se pudo obtener celulares',
        detalle: error.message
      })
    };
  }
};
