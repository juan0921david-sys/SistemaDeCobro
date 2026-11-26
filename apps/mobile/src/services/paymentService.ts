import api from './api';
import type { Installment, Money } from './creditService';

export interface Payment {
    id: string;
    credit_id: string;
    installment_id: string;
    amount: Money;
    payment_type: string;
    payment_method: string;
    notes: string | null;
    created_at: string;
    installments?: { installment_number: number; due_date: string } | null;
}

export interface PaymentResult {
    payment: Payment;
    installment: Installment;
    receipt: { id: string; receipt_number: string; download_url: string } | null;
}

export const getClientPayments = async (clientId: string, signal?: AbortSignal): Promise<Payment[]> =>
    (await api.get(`/payments/client/${encodeURIComponent(clientId)}`, { signal })).data.data || [];

export const payInstallment = async (
    creditId: string, installmentId: string, payment_method: string, notes: string
): Promise<PaymentResult> => (await api.post(
    `/payments/credit/${encodeURIComponent(creditId)}/installment/${encodeURIComponent(installmentId)}`,
    { payment_method, notes: notes.trim() || null }
)).data.data;

export const registerPartialPayment = async (
    creditId: string, amount: number, payment_method: string, notes: string
): Promise<PaymentResult> => (await api.post(
    `/payments/credit/${encodeURIComponent(creditId)}/partial`,
    { amount, payment_method, notes: notes.trim() || null }
)).data.data;
