import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

export default function OfflineBanner() {
    const [isConnected, setIsConnected] = useState<boolean | null>(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    if (isConnected || isConnected === null) return null;

    return (
        <View style={styles.banner}>
            <Ionicons name="cloud-offline" size={20} color="#fff" style={styles.icon} />
            <Text style={styles.text}>No Internet Connection. Reconnecting...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#ef4444',
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999, // Ensure it sits on top
    },
    icon: {
        marginRight: 8,
    },
    text: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
