import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Provider, useDispatch } from 'react-redux';
import { store, persistor } from '@/store';
import { PersistGate } from 'redux-persist/integration/react';
import { useNetInfo } from '@react-native-community/netinfo';
import { syncOfflineQueueAsync } from '@/store/tasksSlice';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { registerForPushNotificationsAsync } from '@/utils/notifications';

import "../global.css";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

function NetworkSyncManager() {
  const netInfo = useNetInfo();
  const dispatch = useDispatch<any>();

  useEffect(() => {
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      dispatch(syncOfflineQueueAsync());
    }
  }, [netInfo.isConnected, netInfo.isInternetReachable, dispatch]);

  return null;
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotificationsAsync();
    
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login' as any);
    } else if (user && inAuthGroup) {
      // Redirect to app if authenticated
      router.replace('/(app)' as any);
    } else {
      // Hide splash screen once routing is fully settled
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return null; // Kept hidden behind the native splash screen
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NetworkSyncManager />
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
