
const express=require("express")
const axios=require("axios")
const cheerio=require("cheerio")
const cors=require("cors")
const cron=require("node-cron")

const app=express()

app.use(cors())
app.use(express.static("public"))

let celulares=[]

async function scrapCelulares(){

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

celulares=productos

console.log("Celulares actualizados:",celulares.length)

}

scrapCelulares()

cron.schedule("*/30 * * * *",()=>{
scrapCelulares()
})

app.get("/celulares",(req,res)=>{
res.json(celulares)
})

app.listen(3000,()=>console.log("Servidor iniciado"))
