import { describe, it, expect } from 'vitest';
import { deploymentConfig } from '../src/config/deployment.js';

describe('configuración de alojamiento (sin conexión a Supabase)', () => {
    it('conserva desarrollo local sin confiar en proxies', () => {
        expect(deploymentConfig({}).trustProxy).toBe(false);
        expect(deploymentConfig({}).origins).toContain('http://localhost:5173');
    });
    it('rechaza producción sin una lista explícita', () => {
        expect(() => deploymentConfig({ NODE_ENV: 'production' })).toThrow('CORS_ORIGINS');
    });
    it('acepta únicamente los orígenes exactos y el número de proxies declarado', () => {
        expect(deploymentConfig({
            NODE_ENV: 'production',
            CORS_ORIGINS: 'https://web.example.com, https://admin.example.com',
            TRUST_PROXY_HOPS: '1',
        })).toEqual({
            origins: ['https://web.example.com', 'https://admin.example.com'], trustProxy: 1,
        });
    });
    it.each([
        'http://web.example.com', 'https://web.example.com/', 'https://web.example.com/login',
        '*', 'https://usuario:clave@web.example.com', 'https://web.example.com?q=1',
    ])('rechaza el origen de producción inválido %s', origin => {
        expect(() => deploymentConfig({ NODE_ENV: 'production', CORS_ORIGINS: origin })).toThrow();
    });
    it.each(['true', '-1', '1.5', '6', ''])('no permite confianza abierta en proxies: %s', hops => {
        expect(() => deploymentConfig({ TRUST_PROXY_HOPS: hops })).toThrow('TRUST_PROXY_HOPS');
    });
});
