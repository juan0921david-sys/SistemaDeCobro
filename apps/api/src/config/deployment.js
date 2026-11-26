export const deploymentConfig = (env = process.env) => {
    const production = env.NODE_ENV === 'production';
    const origins = production
        ? (env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
        : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];
    if (production && !origins.length) throw new Error('Configura CORS_ORIGINS en producción');
    for (const origin of origins) {
        const url = new URL(origin);
        if (url.origin !== origin || (production && url.protocol !== 'https:')) {
            throw new Error('CORS_ORIGINS debe contener orígenes HTTPS exactos, sin rutas ni barra final');
        }
    }
    const hops = env.TRUST_PROXY_HOPS ?? '0';
    if (!/^[0-5]$/.test(hops)) throw new Error('TRUST_PROXY_HOPS debe ser un entero entre 0 y 5');
    return { origins, trustProxy: Number(hops) || false };
};
