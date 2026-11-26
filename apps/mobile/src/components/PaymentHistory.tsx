import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { getClientPayments, type Payment } from '@/services/paymentService';
import { shareReceipt } from '@/services/receiptService';
import { errorMessage, formatMoney } from '@/utils/display';
import { RetroButton } from './RetroButton';
import { Notice, formStyles as s } from './RetroFormModal';

export const PaymentHistory = ({ clientId }: { clientId: string }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const [visible, setVisible] = useState(20);
    const [sharingId, setSharingId] = useState<string | null>(null);
    const locked = useRef(false);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        getClientPayments(clientId, controller.signal)
            .then(data => { if (!controller.signal.aborted) setPayments(data); })
            .catch(err => { if (!controller.signal.aborted) setError(errorMessage(err, 'No fue posible consultar el historial.')); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [clientId, revision]);
    const share = async (id: string) => {
        if (locked.current) return;
        locked.current = true; setSharingId(id); setError('');
        try { await shareReceipt(id); }
        catch (err) { setError(errorMessage(err, 'No fue posible descargar el comprobante.')); }
        finally { locked.current = false; setSharingId(null); }
    };
    return (
        <View style={{ gap: 12 }}>
            {!!error && <Notice>{error}</Notice>}
            <RetroButton title="Actualizar historial" variant="secondary" style={s.secondaryAction} disabled={loading || !!sharingId} onPress={() => setRevision(value => value + 1)} />
            {loading ? <ActivityIndicator /> : <>
                {!payments.length && !error && <Text style={s.text}>No hay pagos registrados.</Text>}
                {payments.slice(0, visible).map(payment => (
                    <View style={s.box} key={payment.id}>
                        <Text style={s.label}>{formatMoney(payment.amount)} · {payment.payment_type === 'full' ? 'Cuota completa' : 'Abono'}</Text>
                        <Text style={s.text}>Cuota {payment.installments?.installment_number ?? '—'} · {new Date(payment.created_at).toLocaleString('es-CO')}</Text>
                        <Text selectable style={s.muted}>Referencia: {payment.id}</Text>
                        {!!payment.notes && <Text style={s.text}>{payment.notes}</Text>}
                        <RetroButton title="Comprobante PDF" variant="secondary" style={s.secondaryAction} loading={sharingId === payment.id} disabled={!!sharingId} onPress={() => void share(payment.id)} />
                    </View>
                ))}
                {visible < payments.length && <RetroButton title="Más pagos" variant="secondary" style={s.secondaryAction} onPress={() => setVisible(value => value + 20)} />}
            </>}
        </View>
    );
};
