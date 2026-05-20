import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { api } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function LoginScreen() {
    const [tenantSlug, setTenantSlug] = useState('');
    const [callsign, setCallsign] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useAuthStore(state => state.login);
    const router = useRouter();
    const { expoPushToken } = usePushNotifications();

    const handleLogin = async () => {
        if (!tenantSlug || !callsign || !pin) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/api/mobile/driver/auth', {
                tenantSlug: tenantSlug.toLowerCase().trim(),
                callsign: callsign.trim(),
                pin: pin.trim()
            });

            const { token, driver, tenant } = response.data;
            await login(token, driver, tenant);

            // Register device token in the background so they can receive Dispatch alerts
            if (expoPushToken?.data) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`; // ensure sync request has token
                api.patch('/api/driver/me/push-token', { expoPushToken: expoPushToken.data })
                    .catch(e => console.error("Failed to sync push token:", e));
            }

            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert(
                'Login Failed',
                error.response?.data?.error || 'Could not connect to the server'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Dispatch Driver</Text>
                    <Text style={styles.subtitle}>Enter your fleet details to login</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.label}>Fleet Code</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. qa-live"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                        value={tenantSlug}
                        onChangeText={setTenantSlug}
                    />

                    <Text style={styles.label}>Callsign</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 101"
                        placeholderTextColor="#9ca3af"
                        keyboardType="default"
                        autoCapitalize="none"
                        value={callsign}
                        onChangeText={setCallsign}
                    />

                    <Text style={styles.label}>PIN</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="****"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        secureTextEntry
                        value={pin}
                        onChangeText={setPin}
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#111827',
        justifyContent: 'center',
        padding: 24,
    },
    headerContainer: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f9fafb',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#9ca3af',
    },
    formContainer: {
        backgroundColor: '#1f2937',
        padding: 24,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#d1d5db',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#374151',
        color: '#f9fafb',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#4b5563',
    },
    button: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
