import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/styles/colors';

interface RetroWindowProps {
    title: string;
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const RetroWindow: React.FC<RetroWindowProps> = ({ title, children, style }) => {
    return (
        <View style={[styles.window, style]}>
            <View style={styles.titleBar}>
                <Text style={styles.titleText}>{title}</Text>
            </View>
            <View style={styles.body}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    window: {
        backgroundColor: Colors.backgroundCard,
        borderWidth: 2,
        borderTopColor: Colors.borderLight,
        borderLeftColor: Colors.borderLight,
        borderRightColor: Colors.borderDark,
        borderBottomColor: Colors.borderDark,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 0,
        elevation: 3,
    },
    titleBar: {
        backgroundColor: Colors.primaryDark,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 12,
    },
    titleText: {
        color: Colors.textLight,
        fontSize: 14,
        fontWeight: 'bold',
    },
    body: {
        padding: 16,
    },
});
