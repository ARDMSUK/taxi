import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSavedPreferencesStore } from '../store/savedPreferencesStore';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();
  const themeMode = useSavedPreferencesStore((state) => state.themeMode);

  if (hasHydrated) {
    if (themeMode === 'system') {
      return colorScheme;
    }
    return themeMode;
  }

  return 'light';
}
