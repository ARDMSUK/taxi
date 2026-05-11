import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '../../store/authStore';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark'];
  const { driver, logout } = useAuthStore();
  
  // Dummy states for UI demonstration
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [largeFont, setLargeFont] = React.useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.icon }]}>PREFERENCES</Text>
        
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="speaker.wave.2.fill" size={20} color={theme.text} />
              <Text style={[styles.rowText, { color: theme.text }]}>Audio Alerts</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: theme.border, true: theme.tint }}
            />
          </View>
          
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="textformat.size" size={20} color={theme.text} />
              <Text style={[styles.rowText, { color: theme.text }]}>Large Text</Text>
            </View>
            <Switch
              value={largeFont}
              onValueChange={setLargeFont}
              trackColor={{ false: theme.border, true: theme.tint }}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.icon }]}>ACCOUNT</Text>
        
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.icon }]}>Driver</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{driver?.name || 'Unknown'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.icon }]}>Callsign</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{driver?.callsign || 'N/A'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: theme.danger + '20', borderColor: theme.danger }]}
          onPress={logout}
        >
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={theme.danger} />
          <Text style={[styles.logoutText, { color: theme.danger }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '800' },
  section: { padding: 20, paddingTop: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 12, letterSpacing: 1 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { fontSize: 16, fontWeight: '500' },
  divider: { height: 1, marginLeft: 48 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  infoLabel: { fontSize: 16 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  logoutText: { fontSize: 16, fontWeight: '700' },
});
