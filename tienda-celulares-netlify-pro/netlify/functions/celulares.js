const axios = require("axios");
const cheerio = require("cheerio");

exports.handler = async function () {
  const productos = [];
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8"
  };

  try {
    for (let pagina = 1; pagina <= 5; pagina++) {
      let url = "https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/";
      if (pagina > 1) {
        url += `page/${pagina}/`;
      }

      const { data } = await axios.get(url, {
        headers,
        timeout: 12000
      });

      const $ = cheerio.load(data);
      let encontrados = 0;

      $(".product").each((i, el) => {
        const nombre =
          $(el).find("h2, .woocommerce-loop-product__title").first().text().trim();

        const precioTexto = $(el).find(".price").first().text().trim();
        const precio = parseFloat((precioTexto || "").replace(/[^0-9]/g, ""));

        const imagen =
          $(el).find("img").attr("src") ||
          $(el).find("img").attr("data-src") ||
          $(el).find("img").attr("data-lazy-src") ||
          "";

        if (!nombre || !precio) return;

        productos.push({
          nombre,
          precio: Math.round(precio * 1.10),
          imagen
        });

        encontrados++;
      });

      if (encontrados === 0) break;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800"
      },
      body: JSON.stringify(productos)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: "No se pudieron obtener celulares",
        detalle: e.message
      })
    };
  }
};
