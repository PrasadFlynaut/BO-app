import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState('');
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      if (data.code) setDevCode(data.code);
      setStep('code');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to send reset code');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) { setError('Please enter the reset code'); return; }
    if (!newPassword.trim() || newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { email, code, new_password: newPassword });
      setStep('success');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          {step === 'email' && (
            <Animated.View entering={FadeInDown.duration(500)}>
              <View style={s.iconBox}>
                <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.iconCircle}>
                  <Ionicons name="lock-open-outline" size={32} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={s.title}>Forgot Password?</Text>
              <Text style={s.subtitle}>Enter your email and we will send you a reset code</Text>
              {error ? <View style={s.errorBox}><Text style={s.error}>{error}</Text></View> : null}
              <Text style={s.label}>Email Address</Text>
              <TextInput style={s.input} placeholder="Enter your email" placeholderTextColor={Colors.textTertiary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <TouchableOpacity onPress={handleSendCode} disabled={loading} activeOpacity={0.8}>
                <LinearGradient colors={[Colors.green, Colors.greenDark]} style={[s.button, Shadow.md]}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>Send Reset Code</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === 'code' && (
            <Animated.View entering={FadeInDown.duration(500)}>
              <View style={s.iconBox}>
                <LinearGradient colors={[Colors.nutritionOrange, '#E88A10']} style={s.iconCircle}>
                  <Ionicons name="keypad-outline" size={32} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={s.title}>Enter Reset Code</Text>
              <Text style={s.subtitle}>We sent a 6-digit code to {email}</Text>
              {devCode ? <View style={[s.errorBox, { backgroundColor: Colors.greenLight }]}><Text style={[s.error, { color: Colors.green }]}>Dev mode code: {devCode}</Text></View> : null}
              {error ? <View style={s.errorBox}><Text style={s.error}>{error}</Text></View> : null}
              <Text style={s.label}>Reset Code</Text>
              <TextInput style={s.input} placeholder="Enter 6-digit code" placeholderTextColor={Colors.textTertiary} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
              <Text style={s.label}>New Password</Text>
              <TextInput style={s.input} placeholder="Min 8 characters" placeholderTextColor={Colors.textTertiary} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              <Text style={s.label}>Confirm Password</Text>
              <TextInput style={s.input} placeholder="Confirm new password" placeholderTextColor={Colors.textTertiary} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              <TouchableOpacity onPress={handleResetPassword} disabled={loading} activeOpacity={0.8}>
                <LinearGradient colors={[Colors.nutritionOrange, '#E88A10']} style={[s.button, Shadow.md]}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>Reset Password</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === 'success' && (
            <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
              <View style={s.iconBox}>
                <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.iconCircle}>
                  <Ionicons name="checkmark-circle-outline" size={32} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={s.title}>Password Reset!</Text>
              <Text style={s.subtitle}>Your password has been changed successfully</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.8}>
                <LinearGradient colors={[Colors.green, Colors.greenDark]} style={[s.button, Shadow.md]}>
                  <Text style={s.buttonText}>Back to Login</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  backBtn: { position: 'absolute', top: 0, left: 0, padding: Spacing.sm },
  iconBox: { alignItems: 'center', marginBottom: Spacing.lg },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.h2, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 22 },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  error: { color: Colors.danger, fontSize: FontSize.small, textAlign: 'center' },
  label: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body, outlineStyle: 'none' as any },
  button: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.xl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
