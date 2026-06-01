import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '../../store/authStore';
import { useSavedPreferencesStore } from '../../store/savedPreferencesStore';
import { api } from '../../utils/api';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark'];
  const { driver, logout } = useAuthStore();

  const {
    themeMode,
    navigationApp,
    autoAccept,
    soundEnabled,
    largeFont,
    setThemeMode,
    setNavigationApp,
    setAutoAccept,
    setSoundEnabled,
    setLargeFont
  } = useSavedPreferencesStore();

  const [compliance, setCompliance] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/api/driver/profile');
        if (data && data.success) {
          setCompliance(data.driver);
        }
      } catch (err) {
        console.log("Failed to fetch compliance documents status:", err);
      }
    };
    fetchProfile();
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        </View>

        {/* DRIVER PROFILE CARD */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>DRIVER PROFILE</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.infoRow}>
              <View style={styles.rowLeft}>
                <IconSymbol name="person.crop.circle.fill" size={22} color={theme.icon} />
                <Text style={[styles.infoLabel, { color: theme.text }]}>Name</Text>
              </View>
              <Text style={[styles.infoValue, { color: theme.icon }]}>{driver?.name || 'Unknown'}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <View style={styles.rowLeft}>
                <IconSymbol name="tag.fill" size={22} color={theme.icon} />
                <Text style={[styles.infoLabel, { color: theme.text }]}>Callsign</Text>
              </View>
              <Text style={[styles.infoValue, { color: theme.icon }]}>{driver?.callsign || 'N/A'}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <View style={styles.rowLeft}>
                <IconSymbol name="phone.fill" size={20} color={theme.icon} />
                <Text style={[styles.infoLabel, { color: theme.text }]}>Phone</Text>
              </View>
              <Text style={[styles.infoValue, { color: theme.icon }]}>{driver?.phone || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* APPEARANCE SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.rowHeader}>
              <IconSymbol name="paintpalette.fill" size={20} color={theme.text} />
              <Text style={[styles.rowText, { color: theme.text }]}>App Theme</Text>
            </View>
            <View style={styles.pillContainer}>
              <TouchableOpacity
                style={[styles.pillBtn, themeMode === 'light' && { backgroundColor: theme.tint }]}
                onPress={() => setThemeMode('light')}
              >
                <Text style={[styles.pillText, { color: themeMode === 'light' ? '#000000' : theme.icon }]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillBtn, themeMode === 'dark' && { backgroundColor: theme.tint }]}
                onPress={() => setThemeMode('dark')}
              >
                <Text style={[styles.pillText, { color: themeMode === 'dark' ? '#000000' : theme.icon }]}>Dark</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillBtn, themeMode === 'system' && { backgroundColor: theme.tint }]}
                onPress={() => setThemeMode('system')}
              >
                <Text style={[styles.pillText, { color: themeMode === 'system' ? '#000000' : theme.icon }]}>System</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* NAVIGATION PREFERENCES */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>NAVIGATION</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.rowHeader}>
              <IconSymbol name="map.fill" size={20} color={theme.text} />
              <Text style={[styles.rowText, { color: theme.text }]}>Default Navigation App</Text>
            </View>
            <View style={styles.pillContainer}>
              <TouchableOpacity
                style={[styles.pillBtn, navigationApp === 'google-maps' && { backgroundColor: theme.tint }]}
                onPress={() => setNavigationApp('google-maps')}
              >
                <Text style={[styles.pillText, { color: navigationApp === 'google-maps' ? '#000000' : theme.icon }]}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillBtn, navigationApp === 'waze' && { backgroundColor: theme.tint }]}
                onPress={() => setNavigationApp('waze')}
              >
                <Text style={[styles.pillText, { color: navigationApp === 'waze' ? '#000000' : theme.icon }]}>Waze</Text>
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.pillBtn, navigationApp === 'apple-maps' && { backgroundColor: theme.tint }]}
                  onPress={() => setNavigationApp('apple-maps')}
                >
                  <Text style={[styles.pillText, { color: navigationApp === 'apple-maps' ? '#000000' : theme.icon }]}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* SYSTEM PREFERENCES */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.switchRow}>
              <View style={styles.rowLeft}>
                <IconSymbol name="bolt.fill" size={20} color={theme.text} />
                <Text style={[styles.rowText, { color: theme.text }]}>Auto-Accept Jobs</Text>
              </View>
              <Switch
                value={autoAccept}
                onValueChange={setAutoAccept}
                trackColor={{ false: theme.border, true: theme.tint }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.switchRow}>
              <View style={styles.rowLeft}>
                <IconSymbol name="speaker.wave.2.fill" size={20} color={theme.text} />
                <Text style={[styles.rowText, { color: theme.text }]}>Audio Alerts</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: theme.border, true: theme.tint }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.switchRow}>
              <View style={styles.rowLeft}>
                <IconSymbol name="textformat.size" size={20} color={theme.text} />
                <Text style={[styles.rowText, { color: theme.text }]}>Large Text</Text>
              </View>
              <Switch
                value={largeFont}
                onValueChange={setLargeFont}
                trackColor={{ false: theme.border, true: theme.tint }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            </View>
          </View>
        </View>

        {/* COMPLIANCE STATUS CARD */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.icon }]}>COMPLIANCE & DOCUMENTS</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.infoRow}>
              <View style={styles.rowLeft}>
                <IconSymbol name="checkmark.shield.fill" size={20} color={compliance?.complianceOverrideActive ? '#f59e0b' : '#10b981'} />
                <Text style={[styles.infoLabel, { color: theme.text }]}>Account Status</Text>
              </View>
              <Text style={[styles.statusText, { color: compliance?.complianceOverrideActive ? '#f59e0b' : '#10b981' }]}>
                {compliance?.complianceOverrideActive ? 'APPROVED (OVERRIDE)' : 'COMPLIANT ✓'}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <View style={styles.rowLeft}>
                <IconSymbol name="doc.text.fill" size={20} color={theme.icon} />
                <Text style={[styles.infoLabel, { color: theme.text }]}>License Expiry</Text>
              </View>
              <Text style={[styles.infoValue, { color: theme.icon }]}>
                {formatDate(compliance?.licenseExpiry || driver?.licenseExpiry)}
              </Text>
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.logoutBtn, { backgroundColor: theme.danger + '15', borderColor: theme.danger }]}
            onPress={logout}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={theme.danger} />
            <Text style={[styles.logoutText, { color: theme.danger }]}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 24, paddingBottom: 8 },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  section: { paddingHorizontal: 24, paddingTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', marginBottom: 8, marginLeft: 8, letterSpacing: 1.5 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 8,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, marginLeft: 48 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 16, fontWeight: '600' },
  infoValue: { fontSize: 15, fontWeight: '500' },
  statusText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  logoutText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
