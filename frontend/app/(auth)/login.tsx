import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/src/auth';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (!user.onboarding_complete) router.replace('/(onboarding)/goals');
      else router.replace('/(tabs)/home');
    }
  }, [user]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try { await login(email, password); } catch (e: any) {
      setError(e.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(600)} style={styles.logoSection}>
            <Image source={{ uri: 'https://customer-assets.emergentagent.com/job_78422c49-5348-441f-bc53-d90eaaac0909/artifacts/9yt4dytf_BO_Logo_Color.png' }} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your wellness journey</Text>
          </Animated.View>

          {error ? <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}><Text style={styles.error}>{error}</Text></Animated.View> : null}

          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text style={styles.label}>Email</Text>
            <TextInput testID="login-email-input" style={styles.input} placeholder="Enter your email" placeholderTextColor={Colors.textTertiary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={styles.label}>Password</Text>
            <TextInput testID="login-password-input" style={styles.input} placeholder="Enter your password" placeholderTextColor={Colors.textTertiary} value={password} onChangeText={setPassword} secureTextEntry />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <TouchableOpacity testID="login-submit-button" onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
              <LinearGradient colors={['#26B50F', '#1E8F0C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.button, Shadow.md]}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Sign In</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity testID="go-to-register-button" onPress={() => router.push('/(auth)/register')} style={styles.linkWrap}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  logoSection: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { width: 100, height: 100, marginBottom: Spacing.md },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, textAlign: 'center', marginTop: Spacing.sm },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  error: { color: Colors.danger, fontSize: FontSize.small, textAlign: 'center' },
  label: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.greenLight, borderWidth: 0, borderRadius: Radius.lg, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body },
  button: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.xl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
  linkWrap: { marginTop: Spacing.lg, alignItems: 'center', paddingBottom: Spacing.xl },
  linkText: { color: Colors.textSecondary, fontSize: FontSize.body },
  linkBold: { color: Colors.green, fontWeight: '700' },
});
