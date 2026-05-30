import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Platform } from 'react-native';

// For local testing on iOS simulator, localhost works. For Android emulator, use 10.0.2.2.
// In production, this should be the deployed Next.js backend URL.
const getBaseUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    if (__DEV__) {
        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:3000';
        }
        return 'http://localhost:3000';
    }
    return 'https://app.cabai.co.uk';
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 10000, // 10 seconds timeout to fail fast in dead zones
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add the JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401s
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid, log out the user
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);
