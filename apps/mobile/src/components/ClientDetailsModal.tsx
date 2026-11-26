import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { RetroButton } from './RetroButton';
import { getClientById, type Client } from '@/services/clientService';
import { getClientCredits, getCreditById, type Credit } from '@/services/creditService';
import { EditClientModal } from './EditClientModal';
import { PaymentModal } from './PaymentModal';
import { PaymentHistory } from './PaymentHistory';
import { Colors } from '@/styles/colors';
import { errorMessage, formatDate, formatMoney, statusLabel } from '@/utils/display';

const frequencyLabel: Record<string, string> = {
    daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual',
};

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Text selectable style={styles.value}>{value || 'No registrado'}</Text>
    </View>
);

export const ClientDetailsModal = ({ clientId, onClose, onChanged }: {
    clientId: string; onClose: () => void; onChanged?: () => void;
}) => {
    const [client, setClient] = useState<Client | null>(null);
    const [credits, setCredits] = useState<Credit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const [expandedCredit, setExpandedCredit] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [payingCreditId, setPayingCreditId] = useState<string | null>(null);
    const [showPayments, setShowPayments] = useState(false);
    const [loadingCreditId, setLoadingCreditId] = useState<string | null>(null);
    const [detailError, setDetailError] = useState('');
    const creditRequest = useRef<AbortController | null>(null);

    useEffect(() => { Keyboard.dismiss(); }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        setClient(null);
        setCredits([]);
        setExpandedCredit(null);
        Promise.all([
            getClientById(clientId, controller.signal),
            getClientCredits(clientId, controller.signal),
        ]).then(([profile, history]) => {
            if (controller.signal.aborted) return;
            setClient(profile);
            setCredits(history);
        }).catch(err => {
            if (!controller.signal.aborted) setError(errorMessage(err, 'No fue posible cargar el cliente.'));
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => { controller.abort(); creditRequest.current?.abort(); };
    }, [clientId, revision]);

    const expandCredit = async (credit: Credit) => {
        creditRequest.current?.abort();
        if (expandedCredit === credit.id) { setExpandedCredit(null); return; }
        const controller = new AbortController();
        creditRequest.current = controller;
        setExpandedCredit(credit.id);
        setLoadingCreditId(credit.id);
        setDetailError('');
        try {
            const details = await getCreditById(credit.id, controller.signal);
            if (!controller.signal.aborted) setCredits(previous => previous.map(item => item.id === credit.id ? details : item));
        } catch (err) {
            if (!controller.signal.aborted) setDetailError(errorMessage(err, 'No fue posible actualizar el detalle del crédito.'));
        } finally {
            if (!controller.signal.aborted) setLoadingCreditId(null);
        }
    };

    return (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <SafeAreaProvider>
            <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.screen}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Cliente</Text>
                    <RetroButton title="Volver" variant="secondary" onPress={onClose} style={styles.backButton} />
                </View>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Cargando perfil y créditos…</Text>
                    </View>
                ) : error ? (
                    <View style={styles.center}>
                        <Text accessibilityRole="alert" style={styles.loadingText}>{error}</Text>
                        <RetroButton title="Reintentar" onPress={() => setRevision(value => value + 1)} />
                    </View>
                ) : client && (
                    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.content}>
                        <View style={styles.window}>
                            <Text style={styles.sectionTitle}>Datos personales</Text>
                            <View style={styles.body}>
                                <Text style={styles.name}>{client.full_name}</Text>
                                <Text style={styles.state}>{client.is_active === false ? 'Cliente inactivo' : 'Cliente activo'}</Text>
                                <Field label="Cédula" value={client.identification} />
                                <Field label="Teléfono" value={client.phone} />
                                <Field label="Dirección" value={client.address} />
                                <Field label="Correo electrónico" value={client.email} />
                                <View style={styles.actions}>
                                    <RetroButton title="Editar datos" variant="secondary" onPress={() => setEditing(true)} />
                                    <RetroButton title={showPayments ? 'Ocultar pagos' : 'Ver pagos'} variant="secondary" onPress={() => setShowPayments(value => !value)} />
                                </View>
                            </View>
                        </View>

                        {showPayments && <View style={styles.window}>
                            <Text style={styles.sectionTitle}>Historial de pagos y abonos</Text>
                            <View style={styles.body}><PaymentHistory clientId={clientId} /></View>
                        </View>}

                        <Text style={styles.historyTitle}>Créditos e historial ({credits.length})</Text>
                        {!credits.length && (
                            <View style={styles.window}>
                                <Text style={styles.empty}>Este cliente todavía no tiene créditos registrados.</Text>
                            </View>
                        )}
                        {credits.map((credit, index) => {
                            const expanded = expandedCredit === credit.id;
                            const installments = [...(credit.installments || [])]
                                .sort((a, b) => a.installment_number - b.installment_number);
                            const paid = installments.filter(item => item.status === 'paid').length;
                            return (
                                <View key={credit.id} style={styles.window}>
                                    <Text style={styles.sectionTitle}>Crédito {index + 1} · {statusLabel(credit.status)}</Text>
                                    <View style={styles.body}>
                                        <Text style={styles.amount}>{formatMoney(credit.amount)}</Text>
                                        <Text style={styles.summary}>Prestado · Inicio: {formatDate(credit.start_date)}</Text>
                                        <Field label="Total pactado" value={formatMoney(credit.total_amount)} />
                                        <Field label="Frecuencia" value={frequencyLabel[credit.payment_frequency] || credit.payment_frequency} />
                                        <Text style={styles.progress}>
                                            {paid} cuotas pagadas de {credit.number_of_installments}
                                        </Text>
                                        <View style={styles.actions}>
                                        {credit.status === 'active' && <RetroButton
                                            title="Registrar cobro"
                                            onPress={() => setPayingCreditId(credit.id)}
                                        />}
                                        <RetroButton
                                            title={expanded ? 'Ocultar cuotas' : 'Ver cuotas'}
                                            variant="secondary"
                                            onPress={() => void expandCredit(credit)}
                                        />
                                        </View>
                                        {expanded && (
                                            <View style={styles.installments}>
                                                {loadingCreditId === credit.id && <ActivityIndicator color={Colors.primaryDark} />}
                                                {!!detailError && <Text accessibilityRole="alert" style={styles.summary}>{detailError}</Text>}
                                                <Field label="Tasa registrada (%)" value={String(credit.interest_rate)} />
                                                <Field label="Fecha de finalización" value={formatDate(credit.end_date)} />
                                                {credit.notes && <Field label="Notas" value={credit.notes} />}
                                                {credit.guarantors && <>
                                                    <Text style={styles.installmentTitle}>Codeudor</Text>
                                                    <Field label="Nombre" value={credit.guarantors.full_name} />
                                                    <Field label="Cédula" value={credit.guarantors.identification} />
                                                    <Field label="Teléfono" value={credit.guarantors.phone} />
                                                    <Field label="Correo" value={credit.guarantors.email} />
                                                </>}
                                                {!installments.length && <Text style={styles.summary}>No hay cuotas registradas para este crédito.</Text>}
                                                {installments.map(installment => (
                                                    <View key={installment.id} style={styles.installment}>
                                                        <Text style={styles.installmentTitle}>Cuota {installment.installment_number} · {statusLabel(installment.status)}</Text>
                                                        <Text style={styles.summary}>Vence: {formatDate(installment.due_date)}</Text>
                                                        <Field label="Valor de la cuota" value={formatMoney(installment.amount)} />
                                                        <Field label="Pagado" value={formatMoney(installment.paid_amount ?? 0)} />
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}
                {editing && client && <EditClientModal
                    client={client}
                    onClose={() => setEditing(false)}
                    onSaved={() => { setEditing(false); setRevision(value => value + 1); onChanged?.(); }}
                />}
                {payingCreditId && client && <PaymentModal
                    creditId={payingCreditId}
                    clientName={client.full_name}
                    identification={client.identification}
                    onClose={() => { setPayingCreditId(null); setRevision(value => value + 1); }}
                />}
            </SafeAreaView>
            </SafeAreaProvider>
        </Modal>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.primaryDark, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { color: Colors.textLight, fontWeight: 'bold', fontSize: 16, flex: 1 },
    backButton: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 12 },
    center: { flex: 1, justifyContent: 'center', padding: 24, gap: 20 },
    loadingText: { color: Colors.textLight, textAlign: 'center', fontSize: 15, lineHeight: 22 },
    content: { padding: 14, gap: 12, paddingBottom: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    window: { backgroundColor: Colors.backgroundCard, borderWidth: 2, borderTopColor: Colors.borderLight, borderLeftColor: Colors.borderLight, borderRightColor: Colors.borderDark, borderBottomColor: Colors.borderDark },
    sectionTitle: { backgroundColor: Colors.primaryDark, color: Colors.textLight, padding: 10, fontSize: 14, fontWeight: 'bold' },
    body: { padding: 12, gap: 10 },
    name: { color: Colors.text, fontSize: 19, fontWeight: 'bold' },
    state: { color: Colors.textMuted, fontSize: 13 },
    field: { gap: 3 },
    label: { color: Colors.textMuted, fontSize: 12 },
    value: { color: Colors.text, fontSize: 15, lineHeight: 21 },
    historyTitle: { color: Colors.textLight, fontSize: 18, fontWeight: 'bold', marginTop: 4 },
    amount: { color: Colors.text, fontSize: 22, fontWeight: 'bold' },
    summary: { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },
    progress: { fontWeight: 'bold', color: Colors.text, fontSize: 13, marginVertical: 4 },
    installments: { gap: 12, marginTop: 8 },
    installment: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.borderDark, padding: 12, gap: 8 },
    installmentTitle: { fontWeight: 'bold', color: Colors.text, fontSize: 14 },
    empty: { color: Colors.text, padding: 20, lineHeight: 22, fontSize: 15 },
});
