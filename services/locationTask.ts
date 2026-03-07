import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Platform } from 'react-native';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

if (Platform.OS !== 'web') {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
        if (error) {
            console.error("Background Location Error:", error);
            return;
        }
        if (data) {
            const { locations } = data as { locations: Location.LocationObject[] };
            const token = useAuthStore.getState().token;

            // Only send location if the driver is authenticated
            if (token && locations && locations.length > 0) {
                try {
                    await api.post('/api/mobile/driver/location', { locations });
                    console.log("📍 Background location sent");
                } catch (err: any) {
                    console.error("Failed to send background location:", err.message);
                }
            }
        }
    });
}

export const startLocationTracking = async () => {
    if (Platform.OS === 'web') {
        console.log("Mock startLocationTracking on Web Simulator");
        return;
    }

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === 'granted') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus === 'granted') {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            if (!hasStarted) {
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 10000,
                    distanceInterval: 50,
                    deferredUpdatesInterval: 10000,
                    showsBackgroundLocationIndicator: true,
                    foregroundService: {
                        notificationTitle: "Dispatch Driver Active",
                        notificationBody: "Tracking your location for job assignments",
                        notificationColor: "#3b82f6",
                    }
                });
                console.log("Background location tracking started.");
            }
        } else {
            console.log("Background location permission denied.");
        }
    } else {
        console.log("Foreground location permission denied.");
    }
};

export const stopLocationTracking = async () => {
    if (Platform.OS === 'web') {
        console.log("Mock stopLocationTracking on Web Simulator");
        return;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log("Background location tracking stopped.");
    }
};
