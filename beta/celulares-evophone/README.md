# Tienda de celulares para Netlify

Proyecto listo para subir a Netlify.

## Qué hace
- Lee celulares desde las 2 páginas de Evophone.
- Muestra buscador, filtro por marca y orden por precio/nombre.
- Tiene botón de consulta por WhatsApp.
- Se vuelve a consultar automáticamente cada 30 minutos.
- También podés forzar actualización con el botón "Actualizar ahora".

## Archivos principales
- `index.html`
- `styles.css`
- `app.js`
- `netlify/functions/celulares.js`
- `netlify.toml`

## Cómo subirlo
1. Descomprimí el ZIP.
2. Subilo a un repositorio de GitHub o arrastrá la carpeta a Netlify.
3. Netlify va a instalar dependencias automáticamente.
4. La función serverless quedará disponible en `/api/celulares`.

## Notas
- Si Evophone cambia el diseño HTML, puede hacer falta ajustar el scraper.
- La actualización depende de que el sitio origen siga accesible desde Netlify.
