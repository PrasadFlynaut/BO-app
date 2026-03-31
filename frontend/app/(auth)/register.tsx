import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/src/auth';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const { register, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (!user.onboarding_complete) router.replace('/(onboarding)/activities');
      else router.replace('/(tabs)/home');
    }
  }, [user]);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) { setError('Please fill in all required fields'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!agreedPrivacy) { setError('Please agree to the Privacy Policy'); return; }
    setLoading(true); setError('');
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await register(fullName, email, password);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(600)} style={styles.logoSection}>
            <Image source={{ uri: 'https://customer-assets.emergentagent.com/job_78422c49-5348-441f-bc53-d90eaaac0909/artifacts/9yt4dytf_BO_Logo_Color.png' }} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your personalized wellness journey</Text>
          </Animated.View>

          {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View> : null}

          <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>First Name</Text>
                <TextInput testID="register-first-name" style={styles.input} placeholder="First" placeholderTextColor={Colors.textTertiary} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput testID="register-last-name" style={styles.input} placeholder="Last" placeholderTextColor={Colors.textTertiary} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <Text style={styles.label}>Email</Text>
            <TextInput testID="register-email-input" style={styles.input} placeholder="Enter your email" placeholderTextColor={Colors.textTertiary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(500)}>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput testID="register-phone-input" style={styles.input} placeholder="+1 (555) 000-0000" placeholderTextColor={Colors.textTertiary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={styles.label}>Date of Birth (Optional)</Text>
            <TextInput testID="register-dob-input" style={styles.input} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.textTertiary} value={dob} onChangeText={setDob} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(500)}>
            <Text style={styles.label}>Password</Text>
            <TextInput testID="register-password-input" style={styles.input} placeholder="Min 8 characters" placeholderTextColor={Colors.textTertiary} value={password} onChangeText={setPassword} secureTextEntry />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(280).duration(500)}>
            <TouchableOpacity style={styles.privacyRow} onPress={() => setAgreedPrivacy(!agreedPrivacy)} activeOpacity={0.7}>
              <View style={[styles.checkbox, agreedPrivacy && styles.checkboxActive]}>
                {agreedPrivacy && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.privacyText}>I agree to the <Text style={styles.privacyLink} onPress={() => router.push('/(auth)/privacy-policy')}>Privacy Policy</Text></Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(500)}>
            <TouchableOpacity testID="register-submit-button" onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.lime, Colors.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.button, Shadow.md]}>
                {loading ? <ActivityIndicator color={Colors.textPrimary} /> : <Text style={styles.buttonText}>Create Account</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

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
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  logoSection: { alignItems: 'center', marginBottom: Spacing.lg },
  logo: { width: 80, height: 80, marginBottom: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, textAlign: 'center', marginTop: Spacing.xs },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  error: { color: Colors.danger, fontSize: FontSize.small, textAlign: 'center' },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  label: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body, outlineStyle: 'none' as any },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  privacyText: { fontSize: FontSize.small, color: Colors.textSecondary },
  privacyLink: { color: Colors.green, fontWeight: '700' },
  button: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.xl },
  buttonText: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700' },
  linkWrap: { marginTop: Spacing.lg, alignItems: 'center', paddingBottom: Spacing.xl },
  linkText: { color: Colors.textSecondary, fontSize: FontSize.body },
  linkBold: { color: Colors.green, fontWeight: '700' },
});
