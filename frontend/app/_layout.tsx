import React, { useEffect, useCallback } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/src/auth';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function WebStyleFix() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.id = 'rn-web-scrollview-fix';
      style.textContent = `
        /* Fix ScrollView content container flex stretching on web */
        [data-testid="menu-scroll"] > div {
          flex: 0 0 auto !important;
        }
      `;
      if (!document.getElementById('rn-web-scrollview-fix')) {
        document.head.appendChild(style);
      }
      return () => {
        const existing = document.getElementById('rn-web-scrollview-fix');
        if (existing) document.head.removeChild(existing);
      };
    }
  }, []);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <WebStyleFix />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' }, animation: 'fade' }} />
      </View>
    </AuthProvider>
  );
}
