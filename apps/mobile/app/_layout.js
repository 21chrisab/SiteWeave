import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import NoOrganizationScreen from '../components/NoOrganizationScreen';

function RootLayoutNav() {
  const { user, loading, activeOrganization, organizationError } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to finish loading before making navigation decisions
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Only redirect if we're certain about the auth state
    // Add a small delay to prevent race conditions with session checks
    const timer = setTimeout(() => {
      if (!user && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (user && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }, 100); // Small delay to ensure session is fully checked

    return () => clearTimeout(timer);
  }, [user, loading, segments, router]);

  // Show no organization screen if user is logged in but has no organization
  if (!loading && user && !activeOrganization && organizationError) {
    return <NoOrganizationScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

