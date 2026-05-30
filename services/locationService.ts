import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { supabase } from '../utils/supabase';
import { useAuthStore } from '../store/authStore';

const LOCATION_TASK_NAME = 'background-location-task';

// Module-level state for throttling DB writes
let lastDbSyncTime = 0;
let lastDbSyncCoords: { lat: number; lng: number } | null = null;
let realtimeChannel: any = null;

// Helper function to calculate distance using Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

const getRealtimeChannel = () => {
    if (realtimeChannel) return realtimeChannel;

    realtimeChannel = supabase.channel('drivers-location', {
        config: {
            broadcast: { self: false },
        },
    });

    realtimeChannel.subscribe((status: string) => {
        console.log(`[Supabase Realtime] Channel status: ${status}`);
    });

    return realtimeChannel;
};

// Define the background task outside of any React components
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Task Manager Error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];

        if (location) {
            const { token, driver } = useAuthStore.getState();

            // Only proceed if authenticated and we have the driver info
            if (!token || !driver?.id) {
                console.log('[Background Task] Skipping location update: Driver not authenticated');
                return;
            }

            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            const heading = location.coords.heading;
            const speed = location.coords.speed;
            const timestamp = location.timestamp;

            try {
                // 1. Broadcast the location via WebSockets (Realtime)
                const channel = getRealtimeChannel();
                channel.send({
                    type: 'broadcast',
                    event: 'location',
                    payload: {
                        driverId: driver.id,
                        lat,
                        lng,
                        heading,
                        speed,
                        timestamp,
                    },
                });
                console.log(`[Background Task] Broadcasted location: ${lat}, ${lng}`);

                // 2. Determine if we should write to the database (Neon) directly
                const now = Date.now();
                let shouldUpdateDb = false;

                if (!lastDbSyncCoords) {
                    shouldUpdateDb = true;
                } else {
                    const elapsed = now - lastDbSyncTime;
                    const distance = getDistance(lastDbSyncCoords.lat, lastDbSyncCoords.lng, lat, lng);
                    
                    // Throttle: >100m or >60s elapsed
                    if (distance >= 100 || elapsed >= 60000) {
                        shouldUpdateDb = true;
                    }
                }

                if (shouldUpdateDb) {
                    // Update database directly bypassing Vercel Functions
                    const { error: dbError } = await supabase
                        .from('drivers')
                        .update({
                            currentLat: lat,
                            currentLng: lng,
                            lastLocationUpdate: new Date().toISOString(),
                            location: JSON.stringify({
                                lat,
                                lng,
                                heading,
                                speed,
                                timestamp,
                            }),
                        })
                        .eq('id', driver.id);

                    if (dbError) {
                        console.error('[Background Task] Supabase direct DB update failed:', dbError);
                    } else {
                        lastDbSyncTime = now;
                        lastDbSyncCoords = { lat, lng };
                        console.log(`[Background Task] Persistent DB location synced directly: ${lat}, ${lng}`);
                    }
                }
            } catch (err) {
                console.error('[Background Task] Location tracking operation failed:', err);
            }
        }
    }
});

class LocationService {
    async requestPermissions() {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            console.warn('Foreground location permission not granted');
            return false;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            console.warn('Background location permission not granted');
            return false;
        }

        return true;
    }

    async startBackgroundTracking() {
        if (Platform.OS === 'web') return;

        const hasPermissions = await this.requestPermissions();
        if (!hasPermissions) return;

        const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isRegistered) {
            console.log('Background location task already registered.');
            return;
        }

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 10, // Or every 10 meters
            deferredUpdatesInterval: 10000,
            showsBackgroundLocationIndicator: true, // Required for iOS
            foregroundService: {
                notificationTitle: "Online",
                notificationBody: "Your location is being shared with dispatch.",
                notificationColor: "#fff",
            },
        });
        console.log('Started background location tracking.');
    }

    async stopBackgroundTracking() {
        if (Platform.OS === 'web') return;

        const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isRegistered) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            console.log('Stopped background location tracking.');
        }
    }
}

export const locationService = new LocationService();

