import type { NewCredit } from '@/services/creditService';
import { parseMoneyInput } from './moneyInput';

export const frequencies = [
    { value: 'daily', label: 'Diario', days: 1 },
    { value: 'weekly', label: 'Semanal', days: 7 },
    { value: 'biweekly', label: 'Quincenal', days: 15 },
    { value: 'monthly', label: 'Mensual', days: 30 },
] as const;

export const todayInput = () => {
    const date = new Date();
    return [date.getDate(), date.getMonth() + 1, date.getFullYear()]
        .map((value, index) => index < 2 ? String(value).padStart(2, '0') : String(value)).join('/');
};
export const dateMask = (value: string) => value.replace(/\D/g, '').slice(0, 8)
    .replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');

export const parseDate = (value: string) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;
    const [, day, month, year] = match;
    const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
    if (Number(year) < 1900 || !Number.isFinite(date.getTime()) ||
        date.getUTCDate() !== Number(day) || date.getUTCMonth() + 1 !== Number(month)) return null;
    return `${year}-${month}-${day}`;
};

// Solo porcentajes: no aplicar separadores de miles a la tasa.
export const parseAmount = (value: string) => {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return NaN;
    return Number(value.trim().replace(',', '.'));
};

export const initialForm = () => ({
    client_full_name: '', client_identification: '', client_phone: '',
    client_email: '', client_address: '', guarantor_full_name: '',
    guarantor_identification: '', guarantor_phone: '', guarantor_email: '',
    amount: '', interest_rate: '', payment_frequency: 'monthly',
    number_of_installments: '', start_date: todayInput(), notes: '',
});
export type CreditForm = ReturnType<typeof initialForm>;
const validEmail = (value: string) => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const validateStep = (step: number, form: CreditForm, guarantor: boolean): string | null => {
    if (step === 0) {
        if (!form.client_full_name.trim() || !form.client_identification.trim()) return 'Completa el nombre y la cédula del cliente.';
        if (!validEmail(form.client_email)) return 'Revisa el correo del cliente.';
    }
    if (step === 1 && guarantor) {
        if (!form.guarantor_full_name.trim() || !form.guarantor_identification.trim()) return 'Completa nombre y cédula del codeudor, o desactiva esa sección.';
        if (!validEmail(form.guarantor_email)) return 'Revisa el correo del codeudor.';
    }
    if (step === 2) {
        if (!Number.isFinite(parseMoneyInput(form.amount)) || parseMoneyInput(form.amount) <= 0) return 'Ingresa un monto válido mayor a cero (ejemplo: 500.000).';
        if (form.interest_rate.trim() && (!Number.isFinite(parseAmount(form.interest_rate)) || parseAmount(form.interest_rate) < 0)) return 'Ingresa una tasa válida, o déjala vacía para usar 0 %.';
        if (!/^\d+$/.test(form.number_of_installments) || Number(form.number_of_installments) < 1 || Number(form.number_of_installments) > 1000) return 'Ingresa entre 1 y 1000 cuotas para la simulación móvil.';
        if (!parseDate(form.start_date)) return 'Ingresa una fecha válida en formato DD/MM/AAAA.';
        const total = parseMoneyInput(form.amount) * (1 + (form.interest_rate.trim() ? parseAmount(form.interest_rate) : 0) / 100 * Number(form.number_of_installments) / 12);
        if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER) return 'El total calculado excede el rango numérico admitido.';
    }
    return null;
};

export const toCreditPayload = (form: CreditForm, guarantor: boolean): NewCredit => ({
    client_full_name: form.client_full_name.trim(),
    client_identification: form.client_identification.trim(),
    client_phone: form.client_phone.trim() || null,
    client_email: form.client_email.trim() || null,
    client_address: form.client_address.trim() || null,
    guarantor_full_name: guarantor ? form.guarantor_full_name.trim() : null,
    guarantor_identification: guarantor ? form.guarantor_identification.trim() : null,
    guarantor_phone: guarantor ? form.guarantor_phone.trim() || null : null,
    guarantor_email: guarantor ? form.guarantor_email.trim() || null : null,
    amount: parseMoneyInput(form.amount),
    interest_rate: form.interest_rate.trim() ? parseAmount(form.interest_rate) : 0,
    number_of_installments: Number(form.number_of_installments),
    payment_frequency: form.payment_frequency,
    start_date: parseDate(form.start_date)!,
    notes: form.notes.trim() || null,
});

// Vista previa: reproduce el cálculo actual del servidor, sin cambiar sus reglas.
export const previewPlan = (payload: NewCredit) => {
    const rate = payload.interest_rate / 100;
    const interest = payload.amount * rate * (payload.number_of_installments / 12);
    const total = payload.amount + interest;
    const days = frequencies.find(item => item.value === payload.payment_frequency)!.days;
    const start = new Date(`${payload.start_date}T12:00:00Z`);
    const installments = Array.from({ length: payload.number_of_installments }, (_, index) => {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + days * index);
        return { number: index + 1, date: date.toISOString().slice(0, 10), amount: Math.round(total / payload.number_of_installments * 100) / 100 };
    });
    return { total: Math.round(total * 100) / 100, interest: Math.round(interest * 100) / 100, installments };
};
