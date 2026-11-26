import React, { useId, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/styles/colors';
import { RetroWindow } from '@/components/RetroWindow';
import { RetroInput } from '@/components/RetroInput';
import { RetroButton } from '@/components/RetroButton';
import { KeyboardToolbar } from '@/components/KeyboardToolbar';

export default function LoginScreen() {
    const { login } = useAuth();
    const [identification, setIdentification] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const accessoryID = useId();

    const handleLogin = async () => {
        if (loading) return;
        Keyboard.dismiss();
        // Validaciones
        if (!identification.trim()) {
            setError('Ingrese su cédula');
            return;
        }
        if (!password.trim()) {
            setError('Ingrese su contraseña');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const result = await login(identification.trim(), password);

            if (!result.success) {
                setError(result.message || 'Error al iniciar sesión');
            }
            // Si es exitoso, el AuthContext + _layout redirigirá automáticamente
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.safeArea}
        >
            <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.keyboardView}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    contentInsetAdjustmentBehavior="never"
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoTitle}>SISTEMA DE COBRO</Text>
                    </View>

                    {/* Ventana de Login */}
                    <RetroWindow title="Acceso de cobrador">
                        <Text style={styles.intro}>Ingresa con tu cédula y contraseña.</Text>

                        {/* Inputs */}
                        <RetroInput
                            label="Cédula:"
                            icon=""
                            value={identification}
                            onChangeText={setIdentification}
                            placeholder="Ej: 12345678"
                            keyboardType="number-pad"
                            inputAccessoryViewID={Platform.OS === 'ios' ? accessoryID : undefined}
                            autoCorrect={false}
                            autoCapitalize="none"
                            autoComplete="username"
                            editable={!loading}
                        />

                        <RetroInput
                            label="Contraseña:"
                            icon=""
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="current-password"
                            returnKeyType="done"
                            onSubmitEditing={() => void handleLogin()}
                            editable={!loading}
                        />

                        {/* Error */}
                        {error ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Botón */}
                        <RetroButton
                            title="Ingresar"
                            icon=""
                            onPress={handleLogin}
                            loading={loading}
                            disabled={loading}
                        />

                        {/* Footer */}
                        <Text style={styles.footer}>Sistema de Cobro © 2026</Text>
                    </RetroWindow>
                </ScrollView>
            </SafeAreaView>
            <KeyboardToolbar nativeID={accessoryID} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 18,
        paddingVertical: 24,
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoTitle: {
        alignItems: 'center',
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.primary,
        letterSpacing: 1,
        textAlign: 'center',
    },
    intro: {
        fontSize: 14,
        lineHeight: 20,
        color: Colors.text,
        marginBottom: 14,
    },
    errorBox: {
        backgroundColor: '#ffe0e0',
        borderWidth: 2,
        borderTopColor: Colors.borderLight,
        borderLeftColor: Colors.borderLight,
        borderRightColor: Colors.borderDark,
        borderBottomColor: Colors.borderDark,
        padding: 8,
        marginBottom: 12,
    },
    errorText: {
        color: Colors.dangerDark,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    footer: {
        textAlign: 'center',
        color: Colors.textMuted,
        fontSize: 10,
        marginTop: 16,
    },
});
