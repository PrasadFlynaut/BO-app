import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { Colors } from '@/src/theme';

export default function SplashScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (!user) {
          router.replace('/(auth)/login');
        } else if (!user.onboarding_complete) {
          router.replace('/(onboarding)/goals');
        } else {
          router.replace('/(tabs)/home');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://customer-assets.emergentagent.com/job_78422c49-5348-441f-bc53-d90eaaac0909/artifacts/349ony80_BO_Logo_White.png' }}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.tagline}>Your Wellness Journey</Text>
      <ActivityIndicator size="large" color={Colors.secondary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 160, marginBottom: 16 },
  tagline: { color: Colors.textSecondary, fontSize: 16, fontWeight: '400', marginTop: 8 },
  loader: { position: 'absolute', bottom: 80 },
});
