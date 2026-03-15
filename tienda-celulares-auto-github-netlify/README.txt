Tienda de celulares para Netlify + actualización automática con GitHub Actions

Qué hace
- Netlify muestra la tienda desde celulares.json
- GitHub Actions intenta actualizar celulares.json cada 30 minutos
- El scraper suma 10% al precio

Importante
- Antes de publicar, cambiá en index.html: 549XXXXXXXXXX por tu número real
- Esta solución depende de que Evophone no bloquee también a GitHub Actions
- Si GitHub Actions llegara a recibir 403, el sitio sigue funcionando con el último celulares.json guardado

Cómo usar
1. Subí esta carpeta a un repositorio de GitHub
2. En GitHub activá Actions si te lo pide
3. Ejecutá una vez la acción "Actualizar celulares" desde la pestaña Actions
4. En Netlify importá el repo desde GitHub
5. Cada vez que cambie celulares.json, Netlify vuelve a publicar

Archivos clave
- index.html
- style.css
- celulares.json
- scripts/update-celulares.js
- .github/workflows/update-celulares.yml
