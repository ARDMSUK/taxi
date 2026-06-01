import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const setLocalItem = async (key: string, value: string) => {
    if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
};

const getLocalItem = async (key: string) => {
    if (Platform.OS === 'web') {
        return localStorage.getItem(key);
    } else {
        return await SecureStore.getItemAsync(key);
    }
};

interface PreferencesState {
    themeMode: 'light' | 'dark' | 'system';
    navigationApp: 'google-maps' | 'waze' | 'apple-maps';
    autoAccept: boolean;
    soundEnabled: boolean;
    largeFont: boolean;
    isInitialized: boolean;
    setThemeMode: (mode: 'light' | 'dark' | 'system') => Promise<void>;
    setNavigationApp: (app: 'google-maps' | 'waze' | 'apple-maps') => Promise<void>;
    setAutoAccept: (val: boolean) => Promise<void>;
    setSoundEnabled: (val: boolean) => Promise<void>;
    setLargeFont: (val: boolean) => Promise<void>;
    initialize: () => Promise<void>;
}

export const useSavedPreferencesStore = create<PreferencesState>((set) => ({
    themeMode: 'dark', // default to dark
    navigationApp: 'google-maps',
    autoAccept: false,
    soundEnabled: true,
    largeFont: false,
    isInitialized: false,
    setThemeMode: async (themeMode) => {
        await setLocalItem('pref_themeMode', themeMode);
        set({ themeMode });
    },
    setNavigationApp: async (navigationApp) => {
        await setLocalItem('pref_navigationApp', navigationApp);
        set({ navigationApp });
    },
    setAutoAccept: async (autoAccept) => {
        await setLocalItem('pref_autoAccept', String(autoAccept));
        set({ autoAccept });
    },
    setSoundEnabled: async (soundEnabled) => {
        await setLocalItem('pref_soundEnabled', String(soundEnabled));
        set({ soundEnabled });
    },
    setLargeFont: async (largeFont) => {
        await setLocalItem('pref_largeFont', String(largeFont));
        set({ largeFont });
    },
    initialize: async () => {
        try {
            const themeMode = await getLocalItem('pref_themeMode') as any;
            const navigationApp = await getLocalItem('pref_navigationApp') as any;
            const autoAccept = await getLocalItem('pref_autoAccept');
            const soundEnabled = await getLocalItem('pref_soundEnabled');
            const largeFont = await getLocalItem('pref_largeFont');

            set({
                themeMode: themeMode || 'dark',
                navigationApp: navigationApp || 'google-maps',
                autoAccept: autoAccept === 'true',
                soundEnabled: soundEnabled !== 'false', // defaults to true
                largeFont: largeFont === 'true',
                isInitialized: true
            });
        } catch (err) {
            console.error("Failed to load driver preferences:", err);
            set({ isInitialized: true });
        }
    }
}));
