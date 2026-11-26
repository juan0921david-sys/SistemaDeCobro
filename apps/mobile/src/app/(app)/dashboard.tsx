import { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, FlatList, Keyboard, Pressable, RefreshControl,
    StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getAllClients, type Client } from '@/services/clientService';
import { ClientDetailsModal } from '@/components/ClientDetailsModal';
import { NewClientCreditModal } from '@/components/NewClientCreditModal';
import { RetroButton } from '@/components/RetroButton';
import { Colors } from '@/styles/colors';
import { errorMessage } from '@/utils/display';

const normalize = (value: string) => value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export default function DashboardScreen() {
    const { user, logout } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const requestRef = useRef<AbortController | null>(null);
    const hasRoute = user?.route_id !== null && user?.route_id !== undefined;

    const loadClients = useCallback(async (refresh = false) => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setError('');
        if (refresh) setRefreshing(true);
        else setLoading(true);
        if (!hasRoute) {
            setClients([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            // El backend filtra por la ruta del trabajador autenticado.
            const data = await getAllClients(controller.signal);
            if (controller.signal.aborted) return;
            setClients(data);
        } catch (err) {
            if (controller.signal.aborted) return;
            setClients([]);
            setError(errorMessage(err, 'No fue posible cargar los clientes.'));
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [hasRoute]);

    useFocusEffect(useCallback(() => {
        setSelectedClientId(null);
        setClients([]);
        void loadClients();
        return () => requestRef.current?.abort();
    }, [loadClients, user?.id, user?.route_id]));

    const filteredClients = useMemo(() => {
        const search = normalize(query);
        return clients.filter(client => {
            return !search || [client.full_name, client.identification, client.phone || '']
                .some(value => normalize(String(value)).includes(search));
        });
    }, [clients, query]);

    const emptyTitle = !hasRoute ? 'Todavía no tienes una ruta asignada'
        : loading ? 'Cargando clientes…'
            : error ? 'No fue posible cargar la ruta'
                : clients.length === 0 ? 'Tu ruta no tiene clientes registrados'
                    : 'No hay clientes que coincidan';
    const emptyDescription = !hasRoute
        ? 'Pide al administrador que asigne una ruta a tu cuenta y vuelve a iniciar sesión.'
        : error || (clients.length === 0
            ? 'Aquí aparecerán los clientes asignados a tu ruta.'
            : 'Prueba con otro nombre, cédula o teléfono.');

    return (
        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.screen}>
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Mi ruta</Text>
                    <Text style={styles.routeName} numberOfLines={2}>
                        {user?.routes?.name || (hasRoute ? 'Ruta asignada' : 'Sin ruta asignada')}
                    </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); void logout(); }} style={styles.logout}>
                    <Text style={styles.logoutText}>Salir</Text>
                </Pressable>
            </View>

            <FlatList
                data={loading || error ? [] : filteredClients}
                keyExtractor={client => client.id}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadClients(true)} tintColor={Colors.primary} />}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.welcome, { flex: 1 }]}>{user?.full_name || 'Trabajador'}</Text>
                            <Pressable accessibilityRole="button" disabled={!hasRoute} style={[styles.smallButton, styles.addButton, !hasRoute && { opacity: 0.5 }]} onPress={() => { Keyboard.dismiss(); setSavedMessage(''); setShowCreate(true); }}>
                                <Text style={styles.smallButtonText}>Nuevo cliente</Text>
                            </Pressable>
                        </View>
                        <View style={styles.searchRow}>
                                <TextInput
                                    accessibilityLabel="Buscar clientes por nombre, cédula o teléfono"
                                    style={[styles.search, { flex: 1 }]}
                                    value={query}
                                    onChangeText={setQuery}
                                    placeholder="Buscar cliente…"
                                    placeholderTextColor={Colors.textMuted}
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                     returnKeyType="search"
                                     clearButtonMode="while-editing"
                                     onSubmitEditing={Keyboard.dismiss}
                                />
                            <Pressable accessibilityRole="button" accessibilityLabel="Actualizar clientes" disabled={loading || refreshing} style={styles.smallButton} onPress={() => void loadClients(true)}>
                                {loading || refreshing ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.smallButtonText}>Actualizar</Text>}
                            </Pressable>
                        </View>
                        {!!savedMessage && <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{savedMessage}</Text>}
                    </View>
                }
                renderItem={({ item }) => (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Consultar perfil, créditos y cuotas de ${item.full_name}`}
                        onPress={() => { Keyboard.dismiss(); setSelectedClientId(item.id); }}
                        style={({ pressed }) => [styles.clientCard, pressed && styles.pressedCard]}
                    >
                        <View style={styles.clientHeading}>
                            <Text style={styles.clientName}>{item.full_name}</Text>
                        </View>
                        <Text style={styles.clientInfo}>Cédula: {item.identification}</Text>
                        <Text style={styles.openLabel}>Consultar perfil y cuotas</Text>
                    </Pressable>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        {loading && <ActivityIndicator size="large" color={Colors.primary} />}
                        <Text accessibilityRole={error ? 'alert' : undefined} style={styles.emptyTitle}>{emptyTitle}</Text>
                        {!loading && <Text style={styles.emptyDescription}>{emptyDescription}</Text>}
                        {!loading && !error && clients.length > 0 && (
                            <RetroButton title="Limpiar búsqueda" onPress={() => setQuery('')} />
                        )}
                    </View>
                }
            />
            {selectedClientId && (
                <ClientDetailsModal
                    key={selectedClientId}
                    clientId={selectedClientId}
                    onClose={() => setSelectedClientId(null)}
                    onChanged={() => void loadClients(true)}
                />
            )}
            {showCreate && <NewClientCreditModal
                onClose={() => { setShowCreate(false); void loadClients(true); }}
                onSaved={() => {
                    setShowCreate(false);
                    setQuery('');
                    setSavedMessage('Cliente y crédito guardados correctamente.');
                    void loadClients(true);
                }}
            />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.primaryDark, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerInfo: { flex: 1, gap: 4 },
    title: { fontSize: 18, fontWeight: 'bold', color: Colors.textLight },
    routeName: { fontSize: 13, color: Colors.textLight },
    logout: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: Colors.backgroundCard, borderWidth: 2, borderTopColor: Colors.borderLight, borderLeftColor: Colors.borderLight, borderRightColor: Colors.borderDark, borderBottomColor: Colors.borderDark },
    logoutText: { color: Colors.text, fontWeight: 'bold', fontSize: 14 },
    list: { flexGrow: 1, padding: 14, gap: 10, paddingBottom: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
    listHeader: { gap: 12 },
    welcome: { color: Colors.textLight, fontSize: 17, fontWeight: 'bold' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    smallButton: { minHeight: 44, flexShrink: 1, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center', backgroundColor: Colors.backgroundCard, borderWidth: 2, borderTopColor: Colors.borderLight, borderLeftColor: Colors.borderLight, borderRightColor: Colors.borderDark, borderBottomColor: Colors.borderDark },
    addButton: { backgroundColor: Colors.primary },
    smallButtonText: { color: Colors.text, fontSize: 13, fontWeight: 'bold' },
    search: { minHeight: 44, minWidth: 0, backgroundColor: '#fff', color: Colors.text, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, borderWidth: 2, borderTopColor: Colors.borderDark, borderLeftColor: Colors.borderDark, borderRightColor: Colors.borderLight, borderBottomColor: Colors.borderLight },
    resultCount: { color: Colors.textLight, fontSize: 12 },
    clientCard: { backgroundColor: Colors.backgroundCard, padding: 12, gap: 6, borderWidth: 2, borderTopColor: Colors.borderLight, borderLeftColor: Colors.borderLight, borderRightColor: Colors.borderDark, borderBottomColor: Colors.borderDark },
    pressedCard: { backgroundColor: '#d0d0d0', borderTopColor: Colors.borderDark, borderLeftColor: Colors.borderDark, borderRightColor: Colors.borderLight, borderBottomColor: Colors.borderLight },
    clientHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    clientName: { flex: 1, color: Colors.text, fontSize: 17, fontWeight: 'bold' },
    clientInfo: { color: Colors.textMuted, fontSize: 13 },
    openLabel: { color: Colors.primaryDark, fontWeight: 'bold', fontSize: 13, marginTop: 4 },
    empty: { padding: 24, alignItems: 'center', gap: 16 },
    emptyTitle: { color: Colors.textLight, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
    emptyDescription: { color: Colors.textLight, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
