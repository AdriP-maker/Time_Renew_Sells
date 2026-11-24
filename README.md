# Time Renew 2026 — Landing Comercial y Checkout (GitHub Pages)

Sitio estático público de **Time Renew 2026** (Phoenix Software Solutions) desplegado con GitHub Pages e integrado con **Paddle.js v2 (Sandbox)**.

## Estructura
- `index.html`: Landing comercial con simulador interactivo de cuadrícula horaria, selector España (EUR) / LatAm (USD), planes con checkout overlay de Paddle y preguntas frecuentes.
- `app.js`: Configuración de `Paddle.js v2` en modo `sandbox` usando token público de cliente (`test_...`) y soporte para enlaces de transacción `?_ptxn=...`.
- `styles.css`: Sistema visual limpio inspirado en la interfaz de escritorio de Time Renew.
- `terminos.html`, `privacidad.html`, `reembolsos.html`: Documentación legal requerida para verificación comercial.

## Pasar de Sandbox a Producción (Live)
1. En `app.js`, actualiza `TIMERENEW_PADDLE.environment` a `"live"`, reemplaza `clientToken` por tu token público `live_...` y actualiza los `priceId` con los de tu catálogo Live.
2. En `index.html`, elimina el bloque superior `.sandbox-bar`.
