import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { api } from '../utils/api'; // Assuming you have an API utility

const LOCATION_TASK_NAME = 'background-location-task';

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
            try {
                // The API utility will attach the Driver's Bearer token automatically if they are logged in.
                await api.patch(`/api/driver/me/location`, {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude
                });
                console.log(`[Background Task] Location synced: ${location.coords.latitude}, ${location.coords.longitude}`);
            } catch (err) {
                console.error('[Background Task] Failed to sync location:', err);
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
            timeInterval: 10000, // Update every 10 seconds (adjust for battery life)
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
