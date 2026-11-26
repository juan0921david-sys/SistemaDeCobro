import type { Credit, Installment } from '@/services/creditService';

export type PaymentMode = 'full' | 'partial';
export const orderedInstallments = (credit: Credit) => [...(credit.installments || [])]
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.installment_number - b.installment_number);

export const paymentTarget = (credit: Credit, mode: PaymentMode, installmentId: string): {
    installment?: Installment; error?: string;
} => {
    if (credit.status !== 'active') return { error: 'Solo se pueden registrar cobros en créditos activos.' };
    const installments = orderedInstallments(credit);
    if (mode === 'partial' && installments.some(item =>
        item.status === 'partial' || (Number(item.paid_amount) > 0 && item.status !== 'paid'))) {
        return { error: 'Hay una cuota con un abono sin completar. La API actual la omite al abonar y no calcula su saldo al pagarla. No registraremos otro abono hasta corregir ese comportamiento.' };
    }
    const installment = mode === 'full'
        ? installments.find(item => item.id === installmentId)
        : installments.find(item => item.status === 'pending');
    if (!installment) return { error: 'No hay una cuota disponible para esta operación.' };
    if (installment.status !== 'pending' || Number(installment.paid_amount || 0) !== 0) {
        return { error: 'Esta cuota ya tiene pagos. La API de pago completo cobra su valor original, no el saldo. Se bloquea para evitar cobrar de más.' };
    }
    if (!Number.isFinite(Number(installment.amount)) || Number(installment.amount) <= 0) {
        return { error: 'La cuota no tiene un importe válido. Solicita revisión al administrador.' };
    }
    // El controlador suma directamente paid_amount; no enviar si viene como texto.
    if (mode === 'partial' && installment.paid_amount != null && typeof installment.paid_amount !== 'number') {
        return { error: 'El importe pagado llegó en un formato que la API no suma de forma segura. Solicita revisión al administrador.' };
    }
    return { installment };
};
