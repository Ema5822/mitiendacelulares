
const axios = require("axios")
const cheerio = require("cheerio")

exports.handler = async function () {

let productos = []
let pagina = 1
let seguir = true

while (seguir) {

  try {

    const url = `https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/${pagina}`

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html"
      }
    })

    const $ = cheerio.load(data)

    let encontrados = 0

    $(".product").each((i, el) => {

      const nombre = $(el).find("h2").text().trim()

      let precioTexto = $(el).find(".woocommerce-Price-amount bdi").first().text().trim()

      if(!precioTexto){
        precioTexto = $(el).find(".price").text().trim()
      }

      const numero = precioTexto
        .replace(/\./g,"")
        .replace(",",".")
        .match(/[0-9]+(\.[0-9]+)?/)

      if(!numero) return

      const precioBase = parseFloat(numero[0])

      if(!precioBase) return

      const precioVenta = Math.round(precioBase * 1.10)

      let imagen =
        $(el).find("img").attr("data-src") ||
        $(el).find("img").attr("data-lazy-src") ||
        $(el).find("img").attr("src")

      productos.push({
        nombre,
        precio_original: precioBase,
        precio: precioVenta,
        imagen
      })

      encontrados++
    })

    if (encontrados === 0) {
      seguir = false
    } else {
      pagina++
    }

  } catch (e) {
    seguir = false
  }
}

return {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=1800"
  },
  body: JSON.stringify(productos)
}

}
