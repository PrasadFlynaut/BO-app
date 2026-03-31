import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/src/auth';

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
  return (
    <AuthProvider>
      <WebStyleFix />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' }, animation: 'fade' }} />
    </AuthProvider>
  );
}
