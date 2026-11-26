import { createContext, useContext, useEffect, useId, type ReactNode } from 'react';
import {
    Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
    StyleSheet, Text, TextInput, type TextInputProps, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/styles/colors';
import { KeyboardToolbar } from './KeyboardToolbar';

const KeyboardAccessoryContext = createContext<string | undefined>(undefined);

export const FormField = ({ label, ...props }: TextInputProps & { label: string }) => {
    const accessoryID = useContext(KeyboardAccessoryContext);
    return (
        <View style={formStyles.field}>
            <Text style={formStyles.label}>{label}</Text>
            <TextInput
                accessibilityLabel={label}
                placeholderTextColor={Colors.textMuted}
                inputAccessoryViewID={Platform.OS === 'ios' && !props.multiline ? accessoryID : undefined}
                {...props}
                style={[formStyles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, props.style]}
            />
        </View>
    );
};

export const Notice = ({ children }: { children: ReactNode }) => (
    <Text accessibilityRole="alert" style={formStyles.notice}>{children}</Text>
);

export const RetroFormModal = ({
    title, onClose, busy = false, children, footer, scrollKey,
}: {
    title: string; onClose: () => void; busy?: boolean;
    children: ReactNode; footer?: ReactNode; scrollKey?: string | number;
}) => {
    const accessoryID = useId();
    useEffect(() => { Keyboard.dismiss(); }, [scrollKey]);
    return (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (!busy) onClose(); }}>
            <SafeAreaProvider>
                <StatusBar style="dark" />
                <KeyboardAccessoryContext.Provider value={accessoryID}>
                    <KeyboardAvoidingView style={formStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={formStyles.screen}>
                            <View style={formStyles.header}>
                                <Text style={formStyles.headerTitle}>{title}</Text>
                                <Pressable style={formStyles.close} accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onClose}>
                                    <Text style={formStyles.closeText}>Cerrar</Text>
                                </Pressable>
                            </View>
                            <ScrollView
                                key={scrollKey}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                                contentInsetAdjustmentBehavior="never"
                                contentContainerStyle={formStyles.content}
                            >
                                {children}
                            </ScrollView>
                            {footer && <View style={formStyles.footer}>{footer}</View>}
                        </SafeAreaView>
                    </KeyboardAvoidingView>
                    <KeyboardToolbar nativeID={accessoryID} />
                </KeyboardAccessoryContext.Provider>
            </SafeAreaProvider>
        </Modal>
    );
};

export const formStyles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.backgroundCard },
    header: { backgroundColor: Colors.primaryDark, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16, flex: 1 },
    close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: Colors.backgroundCard, borderWidth: 2, borderTopColor: '#fff', borderLeftColor: '#fff', borderRightColor: Colors.borderDark, borderBottomColor: Colors.borderDark },
    closeText: { fontWeight: 'bold', color: '#000', fontSize: 14 },
    content: { padding: 14, gap: 12, paddingBottom: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
    footer: { borderTopWidth: 1, borderColor: Colors.borderDark, paddingHorizontal: 14, paddingVertical: 8, gap: 8, backgroundColor: Colors.backgroundCard },
    field: { gap: 5 },
    label: { fontSize: 13, color: '#000', fontWeight: 'bold' },
    input: { minHeight: 44, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, color: '#000', fontSize: 16, borderWidth: 2, borderTopColor: Colors.borderDark, borderLeftColor: Colors.borderDark, borderRightColor: '#fff', borderBottomColor: '#fff' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    text: { color: '#202020', fontSize: 14, lineHeight: 21 },
    muted: { color: '#404040', fontSize: 13, lineHeight: 20 },
    section: { backgroundColor: Colors.primaryDark, color: '#fff', fontWeight: 'bold', padding: 9, fontSize: 14 },
    box: { padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.borderDark, gap: 8 },
    notice: { backgroundColor: '#fff0d0', color: '#572b00', padding: 12, borderWidth: 1, borderColor: '#a15d15', fontSize: 14, lineHeight: 21 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    actions: { flexDirection: 'row', alignItems: 'stretch', gap: 8, width: '100%', maxWidth: 600, alignSelf: 'center' },
    secondaryAction: { alignSelf: 'flex-start' },
    option: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center', flexShrink: 1, borderWidth: 2, borderTopColor: '#fff', borderLeftColor: '#fff', borderRightColor: Colors.borderDark, borderBottomColor: Colors.borderDark },
    optionSelected: { backgroundColor: Colors.primaryLight, borderTopColor: Colors.borderDark, borderLeftColor: Colors.borderDark, borderRightColor: '#fff', borderBottomColor: '#fff' },
});
