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

const deleteLocalItem = async (key: string) => {
    if (Platform.OS === 'web') {
        localStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
};

interface AuthState {
    token: string | null;
    driver: any | null;
    tenant: any | null;
    isLoading: boolean;
    login: (token: string, driver: any, tenant: any) => Promise<void>;
    logout: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    driver: null,
    tenant: null,
    isLoading: true,
    login: async (token, driver, tenant) => {
        await setLocalItem('driverToken', token);
        await setLocalItem('driverData', JSON.stringify(driver));
        await setLocalItem('tenantData', JSON.stringify(tenant));
        set({ token, driver, tenant });
    },
    logout: async () => {
        await deleteLocalItem('driverToken');
        await deleteLocalItem('driverData');
        await deleteLocalItem('tenantData');
        set({ token: null, driver: null, tenant: null });
    },
    initialize: async () => {
        try {
            const token = await getLocalItem('driverToken');
            const driverRaw = await getLocalItem('driverData');
            const tenantRaw = await getLocalItem('tenantData');
            if (token) {
                set({
                    token,
                    driver: driverRaw ? JSON.parse(driverRaw) : null,
                    tenant: tenantRaw ? JSON.parse(tenantRaw) : null,
                    isLoading: false
                });
            } else {
                set({ isLoading: false });
            }
        } catch (err) {
            set({ isLoading: false });
        }
    }
}));
