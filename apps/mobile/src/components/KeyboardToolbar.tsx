import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/styles/colors';

export const KeyboardToolbar = ({ nativeID }: { nativeID: string }) => Platform.OS === 'ios' ? (
    <InputAccessoryView nativeID={nativeID}>
        <View style={styles.bar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Ocultar teclado" onPress={Keyboard.dismiss} style={styles.done}>
                <Text style={styles.text}>Listo</Text>
            </Pressable>
        </View>
    </InputAccessoryView>
) : null;

const styles = StyleSheet.create({
    bar: { backgroundColor: Colors.backgroundCard, borderTopWidth: 1, borderColor: Colors.borderDark, alignItems: 'flex-end', paddingHorizontal: 12 },
    done: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
    text: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
});
