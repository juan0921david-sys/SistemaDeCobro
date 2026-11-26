import { useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, Switch, Text, View } from 'react-native';
import axios from 'axios';
import { RetroButton } from './RetroButton';
import { MoneyField } from './MoneyField';
import { FormField, Notice, RetroFormModal, formStyles as s } from './RetroFormModal';
import { createCredit } from '@/services/creditService';
import { dateMask, frequencies, initialForm, previewPlan, toCreditPayload, validateStep, type CreditForm } from '@/utils/creditForm';
import { errorMessage, formatDate, formatMoney } from '@/utils/display';

const titles = ['Cliente', 'Codeudor', 'Crédito', 'Revisar y guardar'];

export const NewClientCreditModal = ({ onClose, onSaved }: {
    onClose: () => void; onSaved: (clientId: string) => void;
}) => {
    const [form, setForm] = useState(initialForm);
    const [step, setStep] = useState(0);
    const [guarantor, setGuarantor] = useState(false);
    const [contact, setContact] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [uncertain, setUncertain] = useState(false);
    const [visibleInstallments, setVisibleInstallments] = useState(0);
    const locked = useRef(false);
    const plan = useMemo(() => step === 3 &&
        ![0, 1, 2].some(index => validateStep(index, form, guarantor))
        ? previewPlan(toCreditPayload(form, guarantor)) : null, [step, form, guarantor]);
    const change = (name: keyof CreditForm, value: string) => {
        setForm(previous => ({ ...previous, [name]: value }));
        setError('');
    };
    const close = () => {
        if (locked.current) return;
        Alert.alert('Cerrar formulario', 'Los datos no guardados se perderán.', [
            { text: 'Continuar llenando', style: 'cancel' },
            { text: 'Cerrar', style: 'destructive', onPress: onClose },
        ]);
    };
    const next = () => {
        Keyboard.dismiss();
        const message = validateStep(step, form, guarantor);
        if (message) { setError(message); return; }
        setError('');
        setVisibleInstallments(0);
        setStep(Math.min(step + 1, 3));
    };
    const save = async () => {
        if (locked.current || uncertain) return;
        for (let index = 0; index < 3; index++) {
            const message = validateStep(index, form, guarantor);
            if (message) { setStep(index); setError(message); return; }
        }
        locked.current = true;
        setSaving(true);
        setError('');
        try {
            const result = await createCredit(toCreditPayload(form, guarantor));
            onSaved(result.credit.client_id);
        } catch (err) {
            const unknownResult = !axios.isAxiosError(err) || !err.response || err.response.status >= 500;
            setUncertain(unknownResult);
            setError(unknownResult
                ? 'No pudimos confirmar el resultado. El servidor puede haber guardado parte de la operación. Cierra y revisa el listado y los créditos antes de volver a crearla.'
                : errorMessage(err, 'No fue posible guardar el cliente y el crédito.'));
        } finally {
            locked.current = false;
            setSaving(false);
        }
    };

    return (
        <RetroFormModal title="Nuevo cliente y crédito" onClose={close} busy={saving} scrollKey={step} footer={
            <View style={s.actions}>
                {step > 0 && <RetroButton title="Atrás" variant="secondary" disabled={saving || uncertain} onPress={() => { setError(''); setStep(Math.max(step - 1, 0)); }} style={{ flex: 1 }} />}
                <RetroButton title={step === 3 ? 'Guardar' : 'Siguiente'} loading={saving} disabled={uncertain} onPress={step === 3 ? save : next} style={{ flex: 2 }} />
            </View>
        }>
            <Text style={s.muted}>Paso {step + 1} de 4</Text>
            <Text style={s.title}>{titles[step]}</Text>
            {!!error && <Notice>{error}</Notice>}
            {step === 0 && <>
                <FormField label="Nombre completo *" value={form.client_full_name} onChangeText={value => change('client_full_name', value)} autoCapitalize="words" autoComplete="name" maxLength={160} />
                <FormField label="Cédula *" value={form.client_identification} onChangeText={value => change('client_identification', value)} keyboardType="number-pad" maxLength={30} />
                <Pressable accessibilityRole="button" style={s.option} onPress={() => setContact(value => !value)}>
                    <Text style={s.label}>{contact ? 'Ocultar contacto' : 'Añadir contacto (opcional)'}</Text>
                </Pressable>
                {contact && <>
                    <FormField label="Teléfono" value={form.client_phone} onChangeText={value => change('client_phone', value)} keyboardType="phone-pad" autoComplete="tel" />
                    <FormField label="Dirección" value={form.client_address} onChangeText={value => change('client_address', value)} autoCapitalize="sentences" />
                    <FormField label="Correo electrónico" value={form.client_email} onChangeText={value => change('client_email', value)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </>}
                <Text style={s.muted}>Si la cédula ya existe en tu ruta, el servidor usará ese cliente sin modificar sus datos personales.</Text>
            </>}
            {step === 1 && <>
                <View style={s.row}>
                    <Switch accessibilityLabel="Incluir codeudor" value={guarantor} onValueChange={value => { setGuarantor(value); setError(''); }} />
                    <Text style={s.label}>Incluir codeudor</Text>
                </View>
                {guarantor ? <>
                    <FormField label="Nombre del codeudor *" value={form.guarantor_full_name} onChangeText={value => change('guarantor_full_name', value)} autoCapitalize="words" />
                    <FormField label="Cédula del codeudor *" value={form.guarantor_identification} onChangeText={value => change('guarantor_identification', value)} keyboardType="number-pad" />
                    <FormField label="Teléfono" value={form.guarantor_phone} onChangeText={value => change('guarantor_phone', value)} keyboardType="phone-pad" />
                    <FormField label="Correo electrónico" value={form.guarantor_email} onChangeText={value => change('guarantor_email', value)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </> : <Text style={s.text}>No se registrará codeudor. Puedes continuar al crédito.</Text>}
            </>}
            {step === 2 && <>
                <MoneyField label="Monto prestado (COP) *" placeholder="500.000" value={form.amount} onChangeText={value => change('amount', value)} />
                <FormField label="Tasa de interés (%)" placeholder="0" value={form.interest_rate} onChangeText={value => change('interest_rate', value)} keyboardType="decimal-pad" />
                <FormField label="Número de cuotas *" value={form.number_of_installments} onChangeText={value => change('number_of_installments', value)} keyboardType="number-pad" maxLength={4} />
                <Text style={s.label}>Frecuencia *</Text>
                <View style={s.row}>{frequencies.map(item => (
                    <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: form.payment_frequency === item.value }} style={[s.option, form.payment_frequency === item.value && s.optionSelected]} onPress={() => change('payment_frequency', item.value)}>
                        <Text style={s.label}>{item.label}</Text>
                    </Pressable>
                ))}</View>
                <FormField label="Fecha de inicio (DD/MM/AAAA) *" value={form.start_date} onChangeText={value => change('start_date', dateMask(value))} keyboardType="number-pad" maxLength={10} />
                <FormField label="Notas (opcional)" value={form.notes} onChangeText={value => change('notes', value)} multiline maxLength={2000} />
            </>}
            {step === 3 && plan && <>
                <Text style={s.section}>Cliente</Text>
                <Text style={s.text}>{form.client_full_name.trim()} · Cédula {form.client_identification.trim()}</Text>
                <Text style={s.text}>{[form.client_phone, form.client_address, form.client_email].filter(Boolean).join('\n') || 'Sin datos de contacto adicionales'}</Text>
                <Text style={s.text}>{guarantor ? `Codeudor: ${form.guarantor_full_name} · ${form.guarantor_identification}` : 'Sin codeudor'}</Text>
                <Text style={s.section}>Condiciones</Text>
                <View style={s.box}>
                    <Text style={s.text}>Prestado: {formatMoney(toCreditPayload(form, guarantor).amount)}</Text>
                    <Text style={s.text}>Intereses previstos: {formatMoney(plan.interest)}</Text>
                    <Text style={s.label}>Total previsto: {formatMoney(plan.total)}</Text>
                    <Text style={s.text}>{form.number_of_installments} cuotas · {frequencies.find(item => item.value === form.payment_frequency)?.label}</Text>
                    <Text style={s.text}>Cuota prevista: {formatMoney(plan.installments[0]?.amount)}</Text>
                    <Text style={s.text}>Inicio: {form.start_date}</Text>
                    {!!form.notes.trim() && <Text style={s.text}>Notas: {form.notes.trim()}</Text>}
                </View>
                <Text style={s.muted}>Vista previa con el cálculo actual de la API. El plan definitivo lo genera el servidor al guardar.</Text>
                <RetroButton title={visibleInstallments ? 'Ocultar plan' : 'Ver plan de pagos'} variant="secondary" style={s.secondaryAction} onPress={() => setVisibleInstallments(value => value ? 0 : 20)} />
                {plan.installments.slice(0, visibleInstallments).map(item => (
                    <Text key={item.number} style={s.text}>Cuota {item.number} · {formatDate(item.date)} · {formatMoney(item.amount)}</Text>
                ))}
                {visibleInstallments > 0 && visibleInstallments < plan.installments.length && <RetroButton title="Más cuotas" variant="secondary" style={s.secondaryAction} onPress={() => setVisibleInstallments(value => value + 20)} />}
                <Text style={s.muted}>Guardar crea un crédito activo y sus cuotas. Confirma los datos antes de continuar.</Text>
            </>}
        </RetroFormModal>
    );
};
