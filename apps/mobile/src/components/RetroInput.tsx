import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '@/styles/colors';

interface RetroInputProps extends TextInputProps {
    label: string;
    icon?: string;
}

export const RetroInput: React.FC<RetroInputProps> = ({ label, icon, style, ...props }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {icon && `${icon} `}
                {label}
            </Text>
            <TextInput
                accessibilityLabel={label}
                style={[styles.input, style]}
                placeholderTextColor={Colors.textMuted}
                {...props}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderTopColor: Colors.borderDark,
        borderLeftColor: Colors.borderDark,
        borderRightColor: Colors.borderLight,
        borderBottomColor: Colors.borderLight,
        minHeight: 44,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 16,
        color: '#000000',
    },
});
