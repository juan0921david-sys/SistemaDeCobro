import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors } from '@/styles/colors';

interface RetroButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: string;
    style?: ViewStyle;
}

export const RetroButton: React.FC<RetroButtonProps> = ({
    title,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
    icon,
    style,
}) => {
    const isDisabled = disabled || loading;

    const buttonStyle = [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        isDisabled && styles.buttonDisabled,
        style,
    ];

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            style={buttonStyle}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={Colors.text} />
            ) : (
                <Text style={styles.buttonText}>
                    {icon && `${icon} `}
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderTopColor: Colors.borderLight,
        borderLeftColor: Colors.borderLight,
        borderRightColor: Colors.borderDark,
        borderBottomColor: Colors.borderDark,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        flexShrink: 1,
    },
    buttonPrimary: {
        backgroundColor: Colors.primary,
    },
    buttonSecondary: {
        backgroundColor: Colors.backgroundCard,
    },
    buttonDanger: {
        backgroundColor: Colors.danger,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
