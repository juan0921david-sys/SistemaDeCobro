import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from './api';

export const shareReceipt = async (paymentId: string) => {
    if (!await Sharing.isAvailableAsync()) {
        throw new Error('Este dispositivo no permite compartir archivos.');
    }
    const token = await AsyncStorage.getItem('@sistema-cobro:token');
    if (!token) throw new Error('Inicia sesión de nuevo para descargar el comprobante.');
    // Descargar siempre de nuestra API, nunca de una URL arbitraria recibida.
    const destination = new File(Paths.cache, `comprobante-${encodeURIComponent(paymentId)}.pdf`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const file = await File.downloadFileAsync(
            `${API_BASE_URL.replace(/\/$/, '')}/receipts/payment/${encodeURIComponent(paymentId)}/download`,
            destination,
            { headers: { Authorization: `Bearer ${token}` }, idempotent: true, signal: controller.signal }
        );
        clearTimeout(timeout);
        await Sharing.shareAsync(file.uri, {
            mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Compartir comprobante',
        });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('La descarga tardó demasiado. El pago no se vuelve a registrar: intenta descargar el comprobante desde el historial.');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        // No dejar documentos personales en caché después de cerrar el selector.
        try { if (destination.exists) destination.delete(); } catch { /* La caché puede haber sido liberada por el sistema. */ }
    }
};
