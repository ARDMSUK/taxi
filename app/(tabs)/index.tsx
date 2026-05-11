import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView, Linking } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { startLocationTracking, stopLocationTracking } from '../../services/locationTask';
import * as Location from 'expo-location';
import { BACKGROUND_LOCATION_TASK } from '../../services/locationTask';
import { api } from '../../utils/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Audio } from 'expo-av';

interface Job {
    id: string;
    status: string;
    pickupTime: string;
    pickupAddress: string;
    pickupLat?: number;
    pickupLng?: number;
    dropoffAddress: string;
    price: number;
    requiresWav?: boolean;
    customerName?: string;
    customerPhone?: string;
}

export default function HomeScreen() {
    const { driver, logout } = useAuthStore();
    const [isOnline, setIsOnline] = useState(false);
    const [activeJob, setActiveJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [sound, setSound] = useState<Audio.Sound>();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'dark'];
    const [zoneName, setZoneName] = useState<string>("Central");

    async function playSound() {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/beep.mp3') // We will need to create or mock this asset
            );
            setSound(sound);
            await sound.playAsync();
        } catch (e) {
            console.log("Could not play sound", e);
        }
    }

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    useEffect(() => {
        const checkStatus = async () => {
            if (Platform.OS === 'web') {
                setIsOnline(false);
                return;
            }
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            setIsOnline(hasStarted);
        };
        checkStatus();
    }, []);

    const fetchActiveJob = useCallback(async () => {
        if (!isOnline) {
            setActiveJob(null);
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.get('/api/driver/me/jobs');
            if (data && data.length > 0) {
                const newJob = data[0];
                if (!activeJob || newJob.id !== activeJob.id) {
                    if (newJob.status === 'DISPATCHED') {
                        playSound(); // Play beep on new job
                    }
                }
                setActiveJob(newJob);
            } else {
                setActiveJob(null);
            }
        } catch (error) {
            console.error('Failed to fetch active job:', error);
        } finally {
            setLoading(false);
        }
    }, [isOnline, activeJob]);

    useEffect(() => {
        fetchActiveJob();
        let interval: NodeJS.Timeout | null = null;
        
        if (isOnline) {
            interval = setInterval(() => {
                fetchActiveJob();
            }, 10000); // Poll every 10s if online
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [fetchActiveJob, isOnline]);

    const toggleOnlineStatus = async () => {
        try {
            if (isOnline) {
                await stopLocationTracking();
                setIsOnline(false);
                setActiveJob(null);
            } else {
                await startLocationTracking();
                const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
                setIsOnline(hasStarted);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to change online status.');
        }
    };

    const updateJobStatus = async (jobId: string, locationStage: string) => {
        try {
            if (activeJob) {
                if (locationStage === 'UNASSIGNED' || locationStage === 'CLEARED') {
                    setActiveJob(null);
                } else {
                    setActiveJob({ ...activeJob, status: locationStage });
                }
            }
            await api.patch(`/api/mobile/driver/jobs/${jobId}/status`, { status: locationStage });
            fetchActiveJob();
        } catch (error) {
            console.error('Failed to update job status:', error);
            Alert.alert('Error', 'Failed to update job status on the server.');
            fetchActiveJob();
        }
    };

    const triggerPanic = async () => {
        if (!activeJob) return;
        Alert.alert(
            "PANIC ALERT",
            "Are you sure you want to trigger a Panic Alert?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "YES, TRIGGER", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.post('/api/driver/emergency', {
                                driverId: driver?.id,
                                jobId: parseInt(activeJob.id),
                                active: true
                            });
                            Alert.alert("Alert Sent", "Base has been notified immediately.");
                        } catch (e) {
                            Alert.alert("Error", "Failed to send panic alert.");
                        }
                    }
                }
            ]
        );
    };

    const openNavigation = (lat?: number, lng?: number, address?: string) => {
        if (!lat || !lng) {
            const url = Platform.select({
                ios: `maps:0,0?q=${encodeURIComponent(address || '')}`,
                android: `geo:0,0?q=${encodeURIComponent(address || '')}`,
                web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`
            });
            if (url) Linking.openURL(url);
            return;
        }

        const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
        const googleMapsUrl = Platform.select({
            ios: `comgooglemaps://?q=${lat},${lng}`,
            android: `google.navigation:q=${lat},${lng}`,
            web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        });

        Linking.canOpenURL(wazeUrl).then(supported => {
            if (supported && Platform.OS !== 'web') {
                Linking.openURL(wazeUrl);
            } else if (googleMapsUrl) {
                Linking.openURL(googleMapsUrl);
            }
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <View>
                    <Text style={[styles.cabaiBrand, { color: theme.tint }]}>CABAI</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Text style={[styles.callsign, { color: theme.icon }]}>{driver?.callsign}</Text>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.icon }} />
                        <Text style={{ color: theme.icon, fontSize: 14, fontWeight: '600' }}>Zone: {zoneName}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.powerButton, isOnline ? { backgroundColor: theme.tint } : { backgroundColor: theme.border }]}
                    onPress={toggleOnlineStatus}
                >
                    <Text style={[styles.powerText, isOnline ? { color: '#000' } : { color: theme.icon }]}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {isOnline ? (
                    activeJob ? (
                        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.jobId, { color: theme.text }]}>Job #{String(activeJob.id).slice(-4).toUpperCase()}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: theme.tint + '20' }]}>
                                    <Text style={{ color: theme.tint, fontWeight: '800', fontSize: 12 }}>{activeJob.status}</Text>
                                </View>
                            </View>

                            <View style={styles.jobDetails}>
                                <View style={styles.locationRow}>
                                    <View style={[styles.dot, { backgroundColor: theme.tint }]} />
                                    <Text style={[styles.addressText, { color: theme.text }]}>{activeJob.pickupAddress}</Text>
                                </View>
                                <View style={[styles.line, { backgroundColor: theme.border }]} />
                                <View style={styles.locationRow}>
                                    <View style={[styles.dot, styles.dropoffDot, { backgroundColor: theme.danger }]} />
                                    <Text style={[styles.addressText, { color: theme.text }]}>{activeJob.dropoffAddress}</Text>
                                </View>
                            </View>

                            <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
                                <Text style={[styles.priceText, { color: theme.tint }]}>£{activeJob.price.toFixed(2)}</Text>
                                <Text style={[styles.timeText, { color: theme.icon }]}>{new Date(activeJob.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>

                            <View style={styles.actionButtons}>
                                {activeJob.status === 'DISPATCHED' && (
                                    <>
                                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.danger }]} onPress={() => updateJobStatus(activeJob.id, 'UNASSIGNED')}>
                                            <Text style={styles.buttonText}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={() => updateJobStatus(activeJob.id, 'EN_ROUTE')}>
                                            <Text style={[styles.buttonText, { color: '#000' }]}>Accept Job</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                
                                {activeJob.status === 'EN_ROUTE' && (
                                    <>
                                        <TouchableOpacity style={[styles.button, { backgroundColor: '#3b82f6' }]} onPress={() => openNavigation(activeJob.pickupLat, activeJob.pickupLng, activeJob.pickupAddress)}>
                                            <Text style={styles.buttonText}>Navigate</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={() => updateJobStatus(activeJob.id, 'ARRIVED')}>
                                            <Text style={[styles.buttonText, { color: '#000' }]}>Arrived</Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {activeJob.status === 'ARRIVED' && (
                                    <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={() => updateJobStatus(activeJob.id, 'POB')}>
                                        <Text style={[styles.buttonText, { color: '#000' }]}>Passenger on Board</Text>
                                    </TouchableOpacity>
                                )}

                                {activeJob.status === 'POB' && (
                                    <>
                                        <TouchableOpacity style={[styles.button, { backgroundColor: '#3b82f6' }]} onPress={() => openNavigation(undefined, undefined, activeJob.dropoffAddress)}>
                                            <Text style={styles.buttonText}>Navigate</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={() => updateJobStatus(activeJob.id, 'CLEARED')}>
                                            <Text style={[styles.buttonText, { color: '#000' }]}>Complete</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                            
                            {/* PANIC BUTTON */}
                            <TouchableOpacity 
                                style={[styles.panicButton, { borderColor: theme.danger, backgroundColor: theme.danger + '10' }]} 
                                onPress={triggerPanic}
                            >
                                <IconSymbol name="exclamationmark.triangle.fill" size={24} color={theme.danger} />
                                <Text style={[styles.panicText, { color: theme.danger }]}>PANIC ALERT</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.radarCircle, { backgroundColor: theme.tint + '20', borderColor: theme.tint }]}>
                                <IconSymbol name="antenna.radiowaves.left.and.right" size={40} color={theme.tint} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>You're Online</Text>
                            <Text style={[styles.emptyText, { color: theme.icon }]}>Waiting for new jobs in Zone: {zoneName}...</Text>
                        </View>
                    )
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={[styles.radarCircle, { backgroundColor: theme.border, borderColor: theme.icon }]}>
                            <IconSymbol name="moon.fill" size={40} color={theme.icon} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>You're Offline</Text>
                        <Text style={[styles.emptyText, { color: theme.icon }]}>Go online to receive jobs.</Text>
                    </View>
                )}
            </ScrollView>

            {/* BASE MESSAGING FLOATING BUTTON */}
            {isOnline && (
                <TouchableOpacity 
                    style={[styles.fab, { backgroundColor: theme.tint }]}
                    onPress={() => Alert.alert(
                        "Contact Base", 
                        "Select a quick message:", 
                        [
                            { text: "I am outside", onPress: () => sendBaseMessage("I am outside") },
                            { text: "Stuck in traffic", onPress: () => sendBaseMessage("Stuck in traffic") },
                            { text: "Passenger no-show", onPress: () => sendBaseMessage("Passenger no-show") },
                            { text: "I have an emergency going home", onPress: () => sendBaseMessage("I have an emergency going home") },
                            { text: "My app/phone is not working", onPress: () => sendBaseMessage("My app/phone is not working") },
                            { text: "Cancel", style: "cancel" }
                        ]
                    )}
                >
                    <IconSymbol name="message.fill" size={24} color="#000" />
                </TouchableOpacity>
            )}

            {/* MESSAGE CUSTOMER FAB */}
            {isOnline && activeJob && activeJob.customerPhone && (
                <TouchableOpacity 
                    style={[styles.fabCustomer, { backgroundColor: '#3b82f6' }]}
                    onPress={() => Linking.openURL(`sms:${activeJob.customerPhone}`)}
                >
                    <IconSymbol name="phone.bubble.left.fill" size={24} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const sendBaseMessage = async (msg: string) => {
    try {
        await api.post('/api/driver/messages', {
            content: msg,
            sender: 'DRIVER'
        });
        Alert.alert("Sent", "Message sent to base.");
    } catch (error) {
        console.error("Failed to send msg:", error);
        Alert.alert("Error", "Failed to send message to base.");
    }
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    callsign: { fontSize: 14, fontWeight: '700' },
    cabaiBrand: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
    powerButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
    powerText: { fontWeight: '800', fontSize: 14, letterSpacing: 1 },
    scrollContent: { flexGrow: 1, padding: 20, justifyContent: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
    radarCircle: {
        width: 120, height: 120, borderRadius: 60,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, borderWidth: 2,
    },
    emptyTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    emptyText: { fontSize: 16 },
    card: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    jobId: { fontSize: 16, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    jobDetails: { marginBottom: 20 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 12, height: 12, borderRadius: 6, marginRight: 16 },
    dropoffDot: { },
    line: { width: 2, height: 24, marginLeft: 5, marginVertical: 4 },
    addressText: { fontSize: 18, fontWeight: '600', flex: 1 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 16, marginBottom: 20 },
    priceText: { fontSize: 32, fontWeight: '900' },
    timeText: { fontSize: 18, fontWeight: '600' },
    actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    button: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
    panicButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', marginTop: 8
    },
    panicText: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    fabCustomer: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    }
});
