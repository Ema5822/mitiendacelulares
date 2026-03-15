TIENDA CELULARES - NETLIFY

Esta versión usa:
- diseño base tipo WhatsApp
- catálogo con fallback local
- badge visible: Catalogo en vivo / Catalogo local
- carrito y compra por WhatsApp
- detalle del producto desde Netlify Function

COMO SUBIR A NETLIFY
1. Entrá a Netlify.
2. Create a new site > Deploy manually.
3. Arrastrá TODO el contenido de esta carpeta o subí este ZIP directo.
4. Esperá que publique.

IMPORTANTE
- Si Evophone responde, la web muestra "Catálogo en vivo".
- Si Evophone bloquea o falla, la web muestra "Catálogo local" y no se rompe.
- El fallback local incluido trae 15 productos verificados para que siempre cargue algo.

CARPETAS CLAVE
- netlify/functions/celulares.js
- netlify/functions/detalle.js
- data/fallback-celulares.json
- netlify.toml

NUMERO DE WHATSAPP
5493405504914


MEJORA AGREGADA
- La tienda ahora guarda el último catálogo completo que logró cargar en ese navegador.
- Si Evophone falla después, primero intenta mostrar ese catálogo guardado antes de caer al fallback local.
- La función de Netlify ahora intenta primero la vista grande de 72 productos por página y luego las páginas normales como respaldo.
