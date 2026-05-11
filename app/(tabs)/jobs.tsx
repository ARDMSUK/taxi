import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking, Platform, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
    const [activeTab, setActiveTab] = useState<'MY_JOBS' | 'COMPLETED'>('MY_JOBS');
    
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'dark'];

    const fetchJobs = useCallback(async () => {
        try {
            const { data } = await api.get('/api/driver/me/jobs');
            setJobs(data);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
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

    const triggerSOS = async (jobId: string) => {
        try {
            await api.post(`/api/jobs/${jobId}/sos`, { source: 'DRIVER' });
            Alert.alert("SOS Triggered", "Emergency resources and the dispatcher have been notified.");
        } catch (e) {
            Alert.alert("Error", "Failed to trigger SOS.");
        }
    };

    const updateJobStatus = async (jobId: string, locationStage: string) => {
        try {
            setJobs(jobs.map(j => {
                if (String(j.id) === String(jobId)) {
                    return { ...j, status: locationStage };
                }
                return j;
            }));
            await api.patch(`/api/mobile/driver/jobs/${jobId}/status`, { status: locationStage });
        } catch (error) {
            console.error('Failed to update job status:', error);
            Alert.alert('Error', 'Failed to update job status on the server.');
            fetchJobs();
        }
    };

    const filteredJobs = jobs.filter(job => {
        if (activeTab === 'MY_JOBS') {
            return job.status !== 'COMPLETED' && job.status !== 'CLEARED' && job.status !== 'CANCELLED';
        } else {
            return job.status === 'COMPLETED' || job.status === 'CLEARED';
        }
    });

    const renderJobCard = ({ item }: { item: Job }) => {
        return (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.jobId, { color: theme.text }]}>Job #{String(item.id).slice(-4).toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {item.status !== 'COMPLETED' && item.status !== 'CLEARED' && (
                            <TouchableOpacity style={[styles.sosButton, { backgroundColor: theme.danger + '20' }]} onPress={() => triggerSOS(item.id)}>
                                <Text style={[styles.sosText, { color: theme.danger }]}>SOS</Text>
                            </TouchableOpacity>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: theme.tint + '20' }]}>
                            <Text style={{ color: theme.tint, fontWeight: '800', fontSize: 12 }}>{item.status}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.jobDetails}>
                    <View style={styles.locationRow}>
                        <View style={[styles.dot, { backgroundColor: theme.tint }]} />
                        <Text style={[styles.addressText, { color: theme.text }]}>{item.pickupAddress}</Text>
                    </View>
                    <View style={[styles.line, { backgroundColor: theme.border }]} />
                    <View style={styles.locationRow}>
                        <View style={[styles.dot, { backgroundColor: theme.danger }]} />
                        <Text style={[styles.addressText, { color: theme.text }]}>{item.dropoffAddress}</Text>
                    </View>
                </View>

                <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
                    <Text style={[styles.priceText, { color: theme.tint }]}>£{item.price.toFixed(2)}</Text>
                    <Text style={[styles.timeText, { color: theme.icon }]}>{new Date(item.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>

                {item.status !== 'COMPLETED' && item.status !== 'CLEARED' && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#3b82f6' }]}
                            onPress={() => openNavigation(item.pickupLat, item.pickupLng, item.pickupAddress)}
                        >
                            <Text style={styles.buttonText}>Navigate</Text>
                        </TouchableOpacity>

                        {item.status === 'DISPATCHED' && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.tint }]}
                                onPress={() => updateJobStatus(item.id, 'ARRIVED')}
                            >
                                <Text style={[styles.buttonText, { color: '#000' }]}>Arrived</Text>
                            </TouchableOpacity>
                        )}
                        {item.status === 'ARRIVED' && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.tint }]}
                                onPress={() => updateJobStatus(item.id, 'POB')}
                            >
                                <Text style={[styles.buttonText, { color: '#000' }]}>Passenger on Board</Text>
                            </TouchableOpacity>
                        )}
                        {item.status === 'POB' && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.tint }]}
                                onPress={() => updateJobStatus(item.id, 'CLEARED')}
                            >
                                <Text style={[styles.buttonText, { color: '#000' }]}>Clear Job</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.icon, fontSize: 16 }}>Loading Bookings...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Bookings</Text>
                
                {/* Custom Segmented Control */}
                <View style={[styles.tabContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TouchableOpacity 
                        style={[styles.tabSegment, activeTab === 'MY_JOBS' && { backgroundColor: theme.tint }]} 
                        onPress={() => setActiveTab('MY_JOBS')}
                    >
                        <Text style={[styles.tabText, activeTab === 'MY_JOBS' ? { color: '#000', fontWeight: '800' } : { color: theme.icon }]}>My Jobs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabSegment, activeTab === 'COMPLETED' && { backgroundColor: theme.tint }]} 
                        onPress={() => setActiveTab('COMPLETED')}
                    >
                        <Text style={[styles.tabText, activeTab === 'COMPLETED' ? { color: '#000', fontWeight: '800' } : { color: theme.icon }]}>Completed</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredJobs}
                renderItem={renderJobCard}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <IconSymbol name="list.bullet.clipboard" size={48} color={theme.icon} style={{ marginBottom: 12, opacity: 0.5 }} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No {activeTab === 'COMPLETED' ? 'completed' : 'active'} jobs found.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 60 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 24, marginBottom: 20 },
    headerTitle: { fontSize: 32, fontWeight: '800', marginBottom: 16 },
    tabContainer: { 
        flexDirection: 'row', 
        borderRadius: 12, 
        borderWidth: 1,
        padding: 4 
    },
    tabSegment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8
    },
    tabText: { fontSize: 14, fontWeight: '600' },
    listContainer: { paddingHorizontal: 24, paddingBottom: 40 },
    emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyText: { fontSize: 16 },
    card: { borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    jobId: { fontSize: 16, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    sosButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    sosText: { fontWeight: '800', fontSize: 12 },
    jobDetails: { marginBottom: 16 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    line: { width: 2, height: 16, marginLeft: 4, marginVertical: 4 },
    addressText: { fontSize: 15, flex: 1, fontWeight: '500' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 16, marginBottom: 16 },
    priceText: { fontSize: 24, fontWeight: '800' },
    timeText: { fontSize: 16, fontWeight: '600' },
    actionButtons: { flexDirection: 'row', gap: 12 },
    button: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' }
});
