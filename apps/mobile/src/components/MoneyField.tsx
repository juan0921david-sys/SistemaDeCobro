import { useRef, useState } from 'react';
import { Text, View, type TextInputProps } from 'react-native';
import { FormField, formStyles } from './RetroFormModal';
import { editMoneyInput, type MoneySelection } from '@/utils/moneyInput';

type MoneyFieldProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'selection'> & {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
};

export const MoneyField = ({ value, onChangeText, ...props }: MoneyFieldProps) => {
    const nativeSelection = useRef<MoneySelection>({ start: value.length, end: value.length });
    const [selection, setSelection] = useState<MoneySelection>();
    const [invalid, setInvalid] = useState(false);
    return (
        <View style={formStyles.field}>
            <FormField
                {...props}
                value={value}
                selection={selection}
                keyboardType="decimal-pad"
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                onSelectionChange={event => {
                    nativeSelection.current = event.nativeEvent.selection;
                    setSelection(event.nativeEvent.selection);
                }}
                onChangeText={text => {
                    const edit = editMoneyInput(value, text, nativeSelection.current);
                    setInvalid(!edit);
                    if (!edit) {
                        setSelection({ ...nativeSelection.current });
                        return;
                    }
                    nativeSelection.current = edit.selection;
                    setSelection(edit.selection);
                    onChangeText(edit.value);
                }}
            />
            <Text accessibilityLiveRegion="polite" style={formStyles.muted}>
                {invalid ? 'Entrada rechazada; el monto no cambió. Usa 50.000 o 50.000,50.' : 'Miles automáticos · Ejemplo: 50.000,50'}
            </Text>
        </View>
    );
};
