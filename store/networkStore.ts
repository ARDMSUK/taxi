import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface NetworkState {
    isConnected: boolean;
}

export const useNetworkStore = create<NetworkState>((set) => {
    // Subscribe to network changes immediately
    NetInfo.addEventListener(state => {
        set({ isConnected: state.isConnected ?? false });
    });

    return {
        isConnected: true, // assume connected initially
    };
});
