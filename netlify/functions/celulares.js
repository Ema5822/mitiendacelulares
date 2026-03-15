
const axios = require("axios");
const cheerio = require("cheerio");

exports.handler = async function(){

const paginas=[
"https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/1/",
"https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/2/",
"https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/3/",
"https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/4/",
"https://www.evophone.com.ar/categoria-producto/electronica-y-lifestyle/celulares/page/5/"
];

let productos=[];

for(const url of paginas){

const {data}=await axios.get(url);
const $=cheerio.load(data);

$(".product").each((i,el)=>{

let nombre=$(el).find("h2").text().trim();
let precioTexto=$(el).find(".price").text();
let imagen=$(el).find("img").attr("src");

let precio=parseInt(precioTexto.replace(/\D/g,""));

if(nombre && precio){

let precioFinal=Math.round(precio*1.10);

let marca="Otros";
if(nombre.toLowerCase().includes("samsung")) marca="Samsung";
if(nombre.toLowerCase().includes("xiaomi")) marca="Xiaomi";
if(nombre.toLowerCase().includes("moto")) marca="Motorola";

productos.push({
nombre,
precio:precioFinal,
imagen,
marca
});

}

});

}

return {
statusCode:200,
headers:{
"Content-Type":"application/json",
"Cache-Control":"public, max-age=7200"
},
body:JSON.stringify(productos)
};

};
