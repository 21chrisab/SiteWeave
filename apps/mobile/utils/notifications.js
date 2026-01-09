/**
 * Push Notification Service
 * Handles push notification setup, permissions, and token registration
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Check if Device is available (may not be in all environments)
const isDeviceAvailable = Device && typeof Device.isDevice !== 'undefined';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<boolean>} True if permissions granted
 */
export async function requestNotificationPermissions() {
  if (!isDeviceAvailable || !Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return false;
  }

  return true;
}

/**
 * Get push notification token
 * @returns {Promise<string|null>} Push token or null if unavailable
 */
export async function getPushToken() {
  try {
    if (!isDeviceAvailable || !Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0e8aedb2-5084-4046-a750-5032e61afd9a',
    });

    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} token - Push token
 */
export async function registerPushToken(supabase, userId, token) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      // If column doesn't exist, log warning but don't throw
      if (error.message?.includes('column') && error.message?.includes('push_token')) {
        console.warn('push_token column not found. Run scripts/add-push-token-column.sql to add it.');
        return;
      }
      console.error('Error registering push token:', error);
      throw error;
    }

    console.log('Push token registered successfully');
  } catch (error) {
    console.error('Error in registerPushToken:', error);
    // Don't throw - allow app to continue even if push token registration fails
  }
}

/**
 * Setup notification listeners
 * @param {Function} onNotificationReceived - Callback when notification received
 * @param {Function} onNotificationTapped - Callback when notification tapped
 * @returns {Function} Cleanup function
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
  // Listener for notifications received while app is foregrounded
  const receivedListener = Notifications.addNotificationReceivedListener(notification => {
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(receivedListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Schedule a local notification (for testing)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 */
export async function scheduleLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
}
