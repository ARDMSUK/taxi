import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useSavedPreferencesStore } from '../store/savedPreferencesStore';

export function useColorScheme() {
  const nativeScheme = useNativeColorScheme();
  const themeMode = useSavedPreferencesStore((state) => state.themeMode);
  
  if (themeMode === 'system') {
    return nativeScheme;
  }
  return themeMode;
}
