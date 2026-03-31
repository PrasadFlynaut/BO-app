import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/auth';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/(onboarding)/goals');
    }
  }, [user]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image
            source={{ uri: 'https://customer-assets.emergentagent.com/job_78422c49-5348-441f-bc53-d90eaaac0909/artifacts/9yt4dytf_BO_Logo_Color.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your personalized wellness journey</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput testID="register-name-input" style={styles.input} placeholder="Enter your name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} autoCapitalize="words" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput testID="register-email-input" style={styles.input} placeholder="Enter your email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput testID="register-password-input" style={styles.input} placeholder="Create a password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          <TouchableOpacity testID="register-submit-button" style={styles.button} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity testID="go-to-login-button" onPress={() => router.back()} style={styles.linkWrap}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  logo: { width: 100, height: 100, alignSelf: 'center', marginBottom: Spacing.lg },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  error: { color: Colors.danger, fontSize: FontSize.caption, textAlign: 'center', marginBottom: Spacing.md, backgroundColor: 'rgba(255,59,48,0.1)', padding: Spacing.sm, borderRadius: Radius.sm },
  inputGroup: { marginBottom: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body },
  button: { backgroundColor: Colors.secondary, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.lg },
  buttonText: { color: '#000', fontSize: FontSize.body, fontWeight: '700' },
  linkWrap: { marginTop: Spacing.lg, alignItems: 'center', paddingBottom: Spacing.xl },
  linkText: { color: Colors.textSecondary, fontSize: FontSize.body },
  linkBold: { color: Colors.primary, fontWeight: '700' },
});
