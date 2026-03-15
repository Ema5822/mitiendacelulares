Proyecto listo para Netlify.

Qué hace:
- Usa la plantilla visual base de la versión WhatsApp.
- Consulta el catálogo de celulares de Evophone desde una Netlify Function.
- Muestra buscador, filtros por marca, orden por precio/A-Z, carrito y compra por WhatsApp.
- Al abrir el detalle, consulta la página del producto para completar la ficha.
- Si Evophone bloquea temporalmente la consulta, usa un fallback local con productos verificados.

Cómo subir:
1) Descomprimir el ZIP.
2) Subir la carpeta completa a Netlify.
3) Build command: dejar vacío.
4) Publish directory: .
5) Functions directory: netlify/functions

Archivos principales:
- index.html
- style.css
- app.js
- netlify/functions/celulares.js
- netlify/functions/detalle.js
- data/fallback-celulares.json

Importante:
- La actualización se cachea por 30 minutos.
- Los precios e imágenes se intentan tomar desde Evophone en vivo.
- Si Evophone cambia su HTML, puede ser necesario ajustar los selectores de las funciones.
