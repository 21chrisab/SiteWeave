import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Custom hook for haptic feedback with appropriate scales
 * Provides different haptic feedback types for different interactions
 */
export function useHaptics() {
  // Only enable haptics on iOS and Android (not web)
  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  const triggerHaptic = (type) => {
    if (!isSupported) return;

    try {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'success':
          // Success: light impact followed by medium impact
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }, 50);
          break;
        case 'error':
          // Error: heavy impact
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'notification':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      // Silently fail if haptics are not available
      console.debug('Haptic feedback not available:', error);
    }
  };

  return {
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    selection: () => triggerHaptic('selection'),
    success: () => triggerHaptic('success'),
    error: () => triggerHaptic('error'),
    notification: () => triggerHaptic('notification'),
  };
}


















