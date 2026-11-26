// EAS ejecuta este control antes de instalar/compilar. No imprime secretos.
const value = process.env.EXPO_PUBLIC_API_URL;
let url;
try { url = new URL(value); } catch { /* Se informa abajo. */ }
if (!url || url.protocol !== 'https:' || url.pathname !== '/api' ||
    url.username || url.password || url.search || url.hash ||
    /^(localhost|127\.|192\.168\.|10\.|::1$)/i.test(url.hostname) ||
    /TU_API|example\.com/i.test(url.hostname)) {
    console.error('Configura EXPO_PUBLIC_API_URL en el entorno de EAS: https://DOMINIO-REAL/api, sin barra final.');
    process.exit(1);
}
console.log('URL pública HTTPS de la API validada para la compilación.');
