const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/";
const OUTPUT = path.join(process.cwd(), "celulares.json");
const MAX_PAGES = 10;
const MARKUP = 1.10;

function parseBrand(text) {
  const t = text.toLowerCase();
  if (t.includes("samsung")) return "Samsung";
  if (t.includes("moto") || t.includes("motorola")) return "Motorola";
  if (t.includes("xiaomi") || t.includes("poco") || t.includes("redmi")) return "Xiaomi";
  if (t.includes("realme")) return "Realme";
  return "Otra";
}

function parsePrice(priceText) {
  const matches = (priceText || "").match(/\d+/g);
  if (!matches) return null;
  const number = parseInt(matches.join(""), 10);
  if (!number) return null;
  return Math.round(number * MARKUP);
}

async function fetchPage(url) {
  const { data } = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  return data;
}

async function main() {
  const products = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
    let html;

    try {
      html = await fetchPage(url);
    } catch (error) {
      console.log(`No se pudo leer la página ${page}: ${error.message}`);
      break;
    }

    const $ = cheerio.load(html);
    let found = 0;

    $(".product").each((_, el) => {
      const nombre = $(el)
        .find("h2, .woocommerce-loop-product__title, .product-title")
        .first()
        .text()
        .trim()
        .replace(/\s+/g, " ");

      const precioTexto = $(el).find(".price").first().text().trim();
      const precio = parsePrice(precioTexto);

      let imagen =
        $(el).find("img").attr("src") ||
        $(el).find("img").attr("data-src") ||
        $(el).find("img").attr("data-lazy-src") ||
        "";

      if (imagen && imagen.startsWith("//")) {
        imagen = "https:" + imagen;
      }

      if (!nombre || !precio) return;
      if (seen.has(nombre)) return;

      seen.add(nombre);
      found++;

      products.push({
        nombre,
        precio,
        marca: parseBrand(nombre),
        imagen: imagen || "https://placehold.co/320x320/png?text=Celular"
      });
    });

    console.log(`Página ${page}: ${found} productos`);
    if (found === 0) break;
  }

  if (!products.length) {
    throw new Error("No se encontraron productos");
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(products, null, 2), "utf8");
  console.log(`Guardado ${products.length} productos en celulares.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
