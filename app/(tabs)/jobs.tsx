import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking, Platform, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api';

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

export default function JobsScreen() {
    const { token } = useAuthStore();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchJobs = useCallback(async () => {
        try {
            // In a real app we'd query /api/drivers/me/jobs
            const { data } = await api.get('/api/driver/me/jobs');
            setJobs(data);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            // Fallback dummy data if endpoint isn't ready
            setJobs([
                {
                    id: 'job-123',
                    status: 'DISPATCHED',
                    pickupTime: new Date().toISOString(),
                    pickupAddress: 'London Heathrow Airport (LHR)',
                    pickupLat: 51.4694,
                    pickupLng: -0.4500,
                    dropoffAddress: 'London Eye, Riverside Building',
                    price: 45.00,
                    customerName: 'John Doe',
                    customerPhone: '+44 7700 900077'
                }
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchJobs();
    }, [fetchJobs]);

    const openNavigation = (lat?: number, lng?: number, address?: string) => {
        if (!lat || !lng) {
            // Fallback to address search if coords are missing
            const url = Platform.select({
                ios: `maps:0,0?q=${encodeURIComponent(address || '')}`,
                android: `geo:0,0?q=${encodeURIComponent(address || '')}`,
                web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`
            });
            if (url) Linking.openURL(url);
            return;
        }

        // Attempt to open Waze, fallback to Google Maps
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

    const triggerSOS = async (jobId: string) => {
        try {
            await api.post(`/api/jobs/${jobId}/sos`, { source: 'DRIVER' });
            Alert.alert("SOS Triggered", "Emergency resources and the dispatcher have been notified of your location.");
        } catch (e) {
            Alert.alert("Error", "Failed to trigger SOS. Call emergency services directly if in immediate danger.");
        }
    };

    const updateJobStatus = async (jobId: string, locationStage: 'ARRIVED' | 'POB' | 'CLEARED') => {
        // Call your backend API here
        console.log(`Updating job ${jobId} to ${locationStage}`);

        // Optimistic update
        setJobs(jobs.map(j => {
            if (j.id === jobId) {
                return { ...j, status: locationStage };
            }
            return j;
        }));
    };

    const renderJobCard = ({ item }: { item: Job }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.jobId}>Job #{item.id.slice(-4).toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TouchableOpacity style={styles.sosButton} onPress={() => triggerSOS(item.id)}>
                            <Text style={styles.sosText}>SOS</Text>
                        </TouchableOpacity>
                        <Text style={[styles.statusBadge, styles[`status${item.status}` as keyof typeof styles]]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.jobDetails}>
                    <View style={styles.locationRow}>
                        <View style={styles.dot} />
                        <Text style={styles.addressText}>{item.pickupAddress}</Text>
                    </View>
                    <View style={styles.line} />
                    <View style={styles.locationRow}>
                        <View style={[styles.dot, styles.dropoffDot]} />
                        <Text style={styles.addressText}>{item.dropoffAddress}</Text>
                    </View>
                    {item.requiresWav && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 18, marginRight: 8 }}>♿</Text>
                            <Text style={{ color: '#60a5fa', fontWeight: 'bold' }}>Wheelchair Accessible Vehicle Required</Text>
                        </View>
                    )}
                </View>

                <View style={styles.priceRow}>
                    <Text style={styles.priceText}>£{item.price.toFixed(2)}</Text>
                    <Text style={styles.timeText}>{new Date(item.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={() => openNavigation(item.pickupLat, item.pickupLng, item.pickupAddress)}
                    >
                        <Text style={styles.buttonText}>Navigate</Text>
                    </TouchableOpacity>

                    {item.status === 'DISPATCHED' && (
                        <TouchableOpacity
                            style={[styles.button, styles.actionBtn]}
                            onPress={() => updateJobStatus(item.id, 'ARRIVED')}
                        >
                            <Text style={styles.actionBtnText}>Arrived</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'ARRIVED' && (
                        <TouchableOpacity
                            style={[styles.button, styles.actionBtn]}
                            onPress={() => updateJobStatus(item.id, 'POB')}
                        >
                            <Text style={styles.actionBtnText}>Passenger on Board</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'POB' && (
                        <TouchableOpacity
                            style={[styles.button, styles.clearBtn]}
                            onPress={() => updateJobStatus(item.id, 'CLEARED')}
                        >
                            <Text style={styles.actionBtnText}>Clear Job</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.loadingText}>Loading Jobs...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>My Jobs</Text>
            <FlatList
                data={jobs}
                renderItem={renderJobCard}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#fff'} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No active jobs.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
        paddingTop: 60,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f9fafb',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    listContainer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6b7280',
        fontSize: 16,
    },
    card: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    jobId: {
        color: '#d1d5db',
        fontSize: 14,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        backgroundColor: '#4b5563',
        overflow: 'hidden',
    },
    sosButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sosText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12
    },
    statusDISPATCHED: { backgroundColor: '#3b82f6' },
    statusARRIVED: { backgroundColor: '#f59e0b' },
    statusPOB: { backgroundColor: '#8b5cf6' },
    statusCLEARED: { backgroundColor: '#10b981' },
    statusPENDING: { backgroundColor: '#6b7280' },

    jobDetails: {
        marginBottom: 16,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10b981',
        marginRight: 12,
    },
    dropoffDot: {
        backgroundColor: '#ef4444',
    },
    line: {
        width: 2,
        height: 16,
        backgroundColor: '#374151',
        marginLeft: 4,
        marginVertical: 4,
    },
    addressText: {
        color: '#f9fafb',
        fontSize: 15,
        flex: 1,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#374151',
        paddingTop: 16,
        marginBottom: 16,
    },
    priceText: {
        color: '#10b981',
        fontSize: 24,
        fontWeight: 'bold',
    },
    timeText: {
        color: '#9ca3af',
        fontSize: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#3b82f6',
    },
    actionBtn: {
        backgroundColor: '#4b5563',
    },
    clearBtn: {
        backgroundColor: '#10b981',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    actionBtnText: {
        color: '#f9fafb',
        fontSize: 14,
        fontWeight: 'bold',
    }
});
