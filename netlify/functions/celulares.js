const axios = require("axios")
const cheerio = require("cheerio")

exports.handler = async function () {

let productos = []

try {

const url = "https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/"

const { data } = await axios.get(url, {
headers: {
"User-Agent": "Mozilla/5.0"
}
})

const $ = cheerio.load(data)

$(".product").each((i, el) => {

const nombre = $(el).find("h2").text().trim()

const precioTexto = $(el).find(".price").text()

let precio = parseFloat(precioTexto.replace(/[^0-9]/g, ""))

if (!precio) return

let precioVenta = Math.round(precio * 1.10)

const imagen = $(el).find("img").attr("src")

productos.push({
nombre,
precio: precioVenta,
imagen
})

})

} catch (error) {

return {
statusCode: 500,
body: JSON.stringify({ error: "Error obteniendo celulares" })
}

}

return {
statusCode: 200,
headers: {
"Access-Control-Allow-Origin": "*"
},
body: JSON.stringify(productos)
}

}
