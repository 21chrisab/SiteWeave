import { Pressable, Animated } from 'react-native';
import { useRef } from 'react';
import { useHaptics } from '../hooks/useHaptics';

/**
 * A Pressable component with smooth fade animation
 * Provides a better user experience than TouchableOpacity
 * Supports optional haptic feedback
 */
export default function PressableWithFade({ 
  children, 
  style, 
  onPress, 
  disabled = false,
  activeOpacity = 0.6,
  hapticType = 'light', // 'light', 'medium', 'heavy', 'selection', 'success', 'error', or null
  ...props 
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const haptics = useHaptics();

  const handlePressIn = () => {
    Animated.timing(fadeAnim, {
      toValue: activeOpacity,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = (event) => {
    // Trigger haptic feedback before calling onPress
    if (hapticType && !disabled) {
      if (hapticType === 'light') haptics.light();
      else if (hapticType === 'medium') haptics.medium();
      else if (hapticType === 'heavy') haptics.heavy();
      else if (hapticType === 'selection') haptics.selection();
      else if (hapticType === 'success') haptics.success();
      else if (hapticType === 'error') haptics.error();
    }
    
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...props}
    >
      <Animated.View style={[{ opacity: fadeAnim }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}


