import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

export default function AccountDeleteScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/v1/account/delete-request', { password });
      Alert.alert('Account Deletion Requested', 'Your account will be permanently deleted after 30 days. Contact support to reactivate.', [
        { text: 'OK', onPress: () => { logout(); } },
      ]);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Invalid password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {/* Step indicator */}
          <View style={s.stepRow}>
            {[1, 2, 3].map(n => (
              <View key={n} style={[s.stepDot, n === step && s.stepDotActive, n < step && s.stepDotDone]} />
            ))}
          </View>

          {step === 1 && (
            <Animated.View entering={FadeInDown.duration(350)}>
              <View style={s.warningHeader}>
                <Ionicons name="warning-outline" size={32} color="#E53E3E" />
                <Text style={s.warningTitle}>Are you sure?</Text>
              </View>
              <Text style={s.warningSub}>Deleting your account is permanent. Here is what will happen:</Text>
              {[
                'All your health data will be permanently deleted',
                'Your subscription will be cancelled immediately',
                'All earned badges will be lost',
                'Your community posts will be removed',
                'This action cannot be undone after 30 days',
              ].map((item, i) => (
                <View key={i} style={s.consequenceRow}>
                  <Ionicons name="close-circle" size={18} color="#E53E3E" />
                  <Text style={s.consequenceText}>{item}</Text>
                </View>
              ))}
              <TouchableOpacity style={s.understandBtn} onPress={() => setStep(2)}>
                <Text style={s.understandText}>I Understand</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={s.cancelLink}>
                <Text style={s.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInDown.duration(350)} style={{ alignItems: 'center' }}>
              <Text style={s.stepTitle}>Type DELETE to confirm</Text>
              <Text style={s.stepSub}>This confirms you understand the consequences</Text>
              <TextInput
                style={s.input}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="Type DELETE"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                autoFocus
              />
              <TouchableOpacity
                style={[s.confirmBtn, confirmText !== 'DELETE' && { opacity: 0.4 }]}
                onPress={() => { if (confirmText === 'DELETE') setStep(3); }}
                disabled={confirmText !== 'DELETE'}
              >
                <Text style={s.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={s.cancelLink}>
                <Text style={s.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={FadeInDown.duration(350)} style={{ alignItems: 'center' }}>
              <Text style={s.stepTitle}>Enter your password</Text>
              <Text style={s.stepSub}>Final verification before account deletion</Text>
              <View style={s.pwWrap}>
                <TextInput
                  style={s.pwInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPw}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
              {error ? <Text style={s.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={[s.deleteBtn, (!password || loading) && { opacity: 0.4 }]}
                onPress={handleDelete}
                disabled={!password || loading}
              >
                <Text style={s.deleteBtnText}>{loading ? 'Processing...' : 'Delete My Account'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={s.cancelLink}>
                <Text style={s.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  body: { padding: Spacing.lg },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.xl },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E2E8F0' },
  stepDotActive: { backgroundColor: '#E53E3E', width: 24 },
  stepDotDone: { backgroundColor: '#E53E3E' },
  warningHeader: { alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  warningTitle: { fontSize: FontSize.h2, fontWeight: '800', color: '#E53E3E' },
  warningSub: { fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  consequenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  consequenceText: { fontSize: FontSize.body, color: Colors.textSecondary, flex: 1 },
  understandBtn: { marginTop: Spacing.xl, borderWidth: 2, borderColor: '#E53E3E', borderRadius: Radius.pill, paddingVertical: 14, alignItems: 'center' },
  understandText: { color: '#E53E3E', fontWeight: '700', fontSize: FontSize.body },
  cancelLink: { marginTop: Spacing.md, alignItems: 'center', paddingVertical: 8 },
  cancelLinkText: { color: Colors.textTertiary, fontSize: FontSize.body, fontWeight: '500' },
  stepTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  stepSub: { fontSize: FontSize.small, color: Colors.textTertiary, marginBottom: Spacing.lg, textAlign: 'center' },
  input: { width: '100%', backgroundColor: '#F7F8FA', borderRadius: Radius.lg, paddingVertical: 16, paddingHorizontal: 20, fontSize: 20, fontWeight: '700', textAlign: 'center', color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight, letterSpacing: 4 },
  confirmBtn: { marginTop: Spacing.lg, backgroundColor: '#E53E3E', borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 48, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  pwWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden' },
  pwInput: { flex: 1, paddingVertical: 16, paddingHorizontal: 20, fontSize: FontSize.body, color: Colors.textPrimary },
  eyeBtn: { padding: 14 },
  errorText: { color: '#E53E3E', fontSize: FontSize.small, marginTop: 8 },
  deleteBtn: { marginTop: Spacing.lg, backgroundColor: '#E53E3E', borderRadius: Radius.pill, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', width: '100%' },
  deleteBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
});
