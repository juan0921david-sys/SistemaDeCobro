import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, View } from 'react-native';
import axios from 'axios';
import { RetroButton } from './RetroButton';
import { MoneyField } from './MoneyField';
import { FormField, Notice, RetroFormModal, formStyles as s } from './RetroFormModal';
import { getCreditById, type Credit } from '@/services/creditService';
import { payInstallment, registerPartialPayment, type PaymentResult } from '@/services/paymentService';
import { shareReceipt } from '@/services/receiptService';
import { parseMoneyInput } from '@/utils/moneyInput';
import { orderedInstallments, paymentTarget, type PaymentMode } from '@/utils/paymentPolicy';
import { errorMessage, formatDate, formatMoney } from '@/utils/display';

export const PaymentModal = ({ creditId, clientName, identification, onClose }: {
    creditId: string; clientName: string; identification: string; onClose: () => void;
}) => {
    const [credit, setCredit] = useState<Credit | null>(null);
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);
    const [mode, setMode] = useState<PaymentMode>('full');
    const [installmentId, setInstallmentId] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [uncertain, setUncertain] = useState(false);
    const [result, setResult] = useState<PaymentResult | null>(null);
    const [sharing, setSharing] = useState(false);
    const locked = useRef(false);
    const shareLocked = useRef(false);
    const [visibleQuotas, setVisibleQuotas] = useState(20);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        getCreditById(creditId, controller.signal).then(data => {
            if (controller.signal.aborted) return;
            setCredit(data);
            setInstallmentId(orderedInstallments(data).find(item => item.status !== 'paid')?.id || '');
        }).catch(err => {
            if (!controller.signal.aborted) setError(errorMessage(err, 'No fue posible consultar el crédito.'));
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [creditId, revision]);

    const target = credit ? paymentTarget(credit, mode, installmentId) : {};
    const paidValue = mode === 'full' ? Number(target.installment?.amount) : parseMoneyInput(amount);
    const validate = () => {
        if (target.error) return target.error;
        if (!target.installment) return 'Selecciona una cuota.';
        if (!Number.isFinite(paidValue) || paidValue <= 0) return 'Ingresa un monto válido mayor a cero (ejemplo: 20.000).';
        if (paidValue > Number(target.installment.amount)) return 'El monto supera la cuota. La API actual no distribuye excedentes.';
        return null;
    };
    const confirm = () => {
        Keyboard.dismiss();
        const message = validate();
        if (message) { setError(message); return; }
        setError('');
        setConfirming(true);
    };
    const save = async () => {
        if (locked.current || uncertain || !credit || !target.installment) return;
        const message = validate();
        if (message) { setConfirming(false); setError(message); return; }
        locked.current = true;
        setSaving(true);
        let posted = false;
        try {
            // Releer antes de escribir: nunca enviar basándonos solo en una pantalla antigua.
            const latest = await getCreditById(creditId);
            const current = paymentTarget(latest, mode, installmentId);
            if (current.error) throw new Error(current.error);
            if (!current.installment || current.installment.id !== target.installment.id ||
                Number(current.installment.amount) !== Number(target.installment.amount)) {
                throw new Error('La cuota cambió. Cierra y vuelve a consultar el crédito antes de cobrar.');
            }
            posted = true;
            const saved = mode === 'full'
                ? await payInstallment(creditId, current.installment.id, 'cash', notes)
                : await registerPartialPayment(creditId, paidValue, 'cash', notes);
            setResult(saved);
            setError('');
        } catch (err) {
            const unknown = posted && (!axios.isAxiosError(err) || !err.response || err.response.status >= 500);
            setUncertain(unknown);
            setConfirming(false);
            setError(unknown
                ? 'No se pudo confirmar el resultado. El pago puede haberse registrado. No vuelvas a cobrar: cierra y revisa el historial de pagos antes de realizar otra operación.'
                : errorMessage(err, 'No fue posible registrar el cobro.'));
        } finally {
            locked.current = false; setSaving(false);
        }
    };
    const share = async () => {
        if (!result || shareLocked.current) return;
        shareLocked.current = true;
        setSharing(true); setError('');
        try { await shareReceipt(result.payment.id); }
        catch (err) { setError(errorMessage(err, 'El cobro ya está guardado, pero no fue posible compartir su comprobante. Puedes recuperarlo desde el historial.')); }
        finally { setSharing(false); shareLocked.current = false; }
    };
    return (
        <RetroFormModal title={result ? 'Cobro registrado' : 'Registrar cobro'} onClose={onClose} busy={saving || sharing} scrollKey={result ? 'saved' : confirming ? 'confirm' : 'form'} footer={
            result ? <RetroButton title="Volver al cliente" onPress={onClose} disabled={sharing} />
                : !loading && credit ? <View style={s.actions}>
                    {confirming && <RetroButton title="Atrás" variant="secondary" onPress={() => setConfirming(false)} disabled={saving} style={{ flex: 1 }} />}
                    <RetroButton title={confirming ? 'Confirmar cobro' : 'Revisar cobro'} loading={saving} disabled={uncertain || !!target.error} onPress={confirming ? save : confirm} style={{ flex: 2 }} />
                </View> : undefined
        }>
            <Text style={s.title}>{clientName}</Text>
            <Text style={s.muted}>Cédula: {identification}</Text>
            {!!error && <Notice>{error}</Notice>}
            {loading ? <ActivityIndicator /> : result ? <>
                <Text style={s.section}>Registro confirmado por el servidor</Text>
                <Text selectable style={s.text}>Referencia: {result.payment.id}</Text>
                <Text style={s.title}>{formatMoney(result.payment.amount)}</Text>
                <Text style={s.text}>{result.payment.payment_type === 'full' ? 'Pago completo de cuota' : 'Abono'}</Text>
                <Text style={s.text}>Cuota {result.installment.installment_number}</Text>
                <Text style={s.text}>Comprobante: {result.receipt?.receipt_number || 'Disponible para generar al descargar'}</Text>
                <RetroButton title="Comprobante PDF" variant="secondary" style={s.secondaryAction} loading={sharing} onPress={share} />
                <Text style={s.muted}>Selecciona WhatsApp o Guardar en Archivos en el menú del teléfono. No registres otro pago para obtener el comprobante.</Text>
            </> : !credit ? <RetroButton title="Reintentar consulta" onPress={() => setRevision(value => value + 1)} /> : confirming ? <>
                <Text style={s.section}>Confirma el dinero recibido</Text>
                <View style={s.box}>
                    <Text style={s.text}>{mode === 'full' ? 'Pago completo' : 'Abono'} · Cuota {target.installment?.installment_number}</Text>
                    <Text style={s.title}>{formatMoney(paidValue)}</Text>
                    <Text style={s.text}>Método: efectivo</Text>
                    {!!notes.trim() && <Text style={s.text}>Notas: {notes.trim()}</Text>}
                </View>
                <Text style={s.text}>Confirma únicamente si recibiste este importe. El registro modifica el saldo y no se puede deshacer desde la app.</Text>
            </> : <>
                <View style={s.row}>{(['full', 'partial'] as const).map(value => (
                    <Pressable key={value} disabled={uncertain} accessibilityRole="button" accessibilityState={{ selected: mode === value, disabled: uncertain }} style={[s.option, mode === value && s.optionSelected]} onPress={() => { setMode(value); setError(''); }}>
                        <Text style={s.label}>{value === 'full' ? 'Cuota completa' : 'Abono'}</Text>
                    </Pressable>
                ))}</View>
                {mode === 'full' && <>
                    <Text style={s.label}>Selecciona la cuota recibida</Text>
                    {orderedInstallments(credit).filter(item => item.status !== 'paid').slice(0, visibleQuotas).map(item => (
                        <Pressable key={item.id} disabled={uncertain} accessibilityRole="button" accessibilityState={{ selected: installmentId === item.id, disabled: uncertain }} style={[s.option, installmentId === item.id && s.optionSelected]} onPress={() => { setInstallmentId(item.id); setError(''); }}>
                            <Text style={s.label}>Cuota {item.installment_number} · {formatMoney(item.amount)}</Text>
                            <Text style={s.muted}>{formatDate(item.due_date)}{item.status === 'partial' ? ' · Tiene abonos previos' : ''}</Text>
                        </Pressable>
                    ))}
                    {orderedInstallments(credit).filter(item => item.status !== 'paid').length > visibleQuotas && <RetroButton title="Más cuotas" variant="secondary" style={s.secondaryAction} onPress={() => setVisibleQuotas(value => value + 20)} />}
                </>}
                {!!target.error && <Notice>{target.error}</Notice>}
                {target.installment && <View style={s.box}>
                    <Text style={s.label}>Cuota {target.installment.installment_number} · {formatDate(target.installment.due_date)}</Text>
                    <Text style={s.text}>Valor: {formatMoney(target.installment.amount)}</Text>
                </View>}
                {mode === 'partial' && <>
                    <Text style={s.muted}>La API aplica el abono a la primera cuota pendiente por fecha. No admite seleccionar otra ni repartir excedentes.</Text>
                    <MoneyField label="Dinero recibido (COP)" value={amount} onChangeText={value => { setAmount(value); setError(''); }} placeholder="20.000" editable={!uncertain} />
                </>}
                <Text style={s.text}>Método: efectivo</Text>
                <FormField label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline maxLength={1000} editable={!uncertain} />
            </>}
        </RetroFormModal>
    );
};
