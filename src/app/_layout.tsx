import { AuthProvider, useAuth } from '@/context/AuthContext';
import { persistor, store } from '@/store';
import { syncOfflineQueueAsync } from '@/store/tasksSlice';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import { useNetInfo } from '@react-native-community/netinfo';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => { });

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
      router.replace('/(auth)/login' as any);
    } else if (user && inAuthGroup) {
      router.replace('/(app)' as any);
    } else {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return null;
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
