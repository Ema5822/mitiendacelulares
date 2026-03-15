
const axios=require("axios")
const cheerio=require("cheerio")

exports.handler=async function(){

let productos=[]
let pagina=1
let seguir=true

while(seguir){

try{

const url=`https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/${pagina}`

const {data}=await axios.get(url)

const $=cheerio.load(data)

let encontrados=0

$(".product").each((i,el)=>{

const nombre=$(el).find("h2").text().trim()

const precioTexto=$(el).find(".price").text()

let precio=parseFloat(precioTexto.replace(/[^0-9]/g,""))

if(!precio) return

let precioVenta=Math.round(precio*1.10)

const imagen=$(el).find("img").attr("src")

productos.push({
nombre,
precio:precioVenta,
imagen
})

encontrados++

})

if(encontrados===0){
seguir=false
}else{
pagina++
}

}catch{
seguir=false
}

}

return{
statusCode:200,
headers:{
"Access-Control-Allow-Origin":"*",
"Cache-Control":"public, max-age=1800"
},
body:JSON.stringify(productos)
}

}
