import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export interface PushNotificationState {
    expoPushToken?: Notifications.ExpoPushToken;
    notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
    if (Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldPlaySound: true,
                shouldShowAlert: true,
                shouldSetBadge: false, // Badge counts require additional setup outside scope
            }),
        });
    }

    const [expoPushToken, setExpoPushToken] = useState<
        Notifications.ExpoPushToken | undefined
    >();
    const [notification, setNotification] = useState<
        Notifications.Notification | undefined
    >();

    const notificationListener = useRef<Notifications.EventSubscription>();
    const responseListener = useRef<Notifications.EventSubscription>();

    async function registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (!Notifications.getPermissionsAsync) {
            console.log('Push notifications are not supported in Expo Go on SDK 53+');
            return undefined;
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                // Failed to get push token, ignore natively without crashing
                return;
            }

            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;

            if (!projectId) {
                console.warn("Project ID not found. Ensure app.json has eas.projectId and you ran 'eas build:configure'. Skipping push token assignment for development simulation.");
                return;
            }

            token = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

        } else {
            console.log('Must use physical device for Push Notifications');
        }

        return token;
    }

    useEffect(() => {
        registerForPushNotificationsAsync().then((token) => {
            setExpoPushToken(token);
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                setNotification(notification);
            }
        );

        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                // Handle physical notification taps
                console.log("Notification tapped", response.notification.request.content.data);
            }
        );

        return () => {
            if (notificationListener.current && notificationListener.current.remove) {
                notificationListener.current.remove();
            }
            if (responseListener.current && responseListener.current.remove) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
    };
};
