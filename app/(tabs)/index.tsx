import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { startLocationTracking, stopLocationTracking } from '../../services/locationTask';
import * as Location from 'expo-location';
import { BACKGROUND_LOCATION_TASK } from '../../services/locationTask';

export default function HomeScreen() {
  const { driver, logout } = useAuthStore();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check if tracking is currently active when component mounts
    const checkStatus = async () => {
      if (Platform.OS === 'web') {
        setIsOnline(false);
        return;
      }
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      setIsOnline(hasStarted);
    };
    checkStatus();
  }, []);

  const toggleOnlineStatus = async () => {
    try {
      if (isOnline) {
        await stopLocationTracking();
        setIsOnline(false);
      } else {
        await startLocationTracking();
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        setIsOnline(hasStarted);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to change online status.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dispatch Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.label}>Driver Name:</Text>
        <Text style={styles.value}>{driver?.name || 'Unknown'}</Text>

        <Text style={styles.label}>Callsign:</Text>
        <Text style={styles.value}>{driver?.callsign || 'Unknown'}</Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Current Status:</Text>
        <Text style={[styles.statusText, { color: isOnline ? '#10b981' : '#6b7280' }]}>
          {isOnline ? 'ONLINE & TRACKING' : 'OFFLINE'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.toggleButton, { backgroundColor: isOnline ? '#ef4444' : '#10b981' }]}
        onPress={toggleOnlineStatus}
      >
        <Text style={styles.toggleButtonText}>
          {isOnline ? 'Go Offline' : 'Go Online'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  logoutText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: '#1f2937',
    padding: 24,
    borderRadius: 12,
    marginBottom: 32,
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    color: '#f9fafb',
    fontWeight: '600',
    marginBottom: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statusLabel: {
    fontSize: 16,
    color: '#d1d5db',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  toggleButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
