import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, TextInputProps } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuth } from '@/src/auth';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { validateEmail, validatePassword, validateDateOfBirth, validatePhone, validateName, runValidations, isPasswordValid } from '@/src/validation';

// Reusable focused input with highlight + optional info icon
function FocusInput({ label, info, ...props }: TextInputProps & { label: string; info?: string }) {
  const [focused, setFocused] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  return (
    <View style={fi.wrap}>
      <View style={fi.labelRow}>
        <Text style={fi.label}>{label}</Text>
        {info && (
          <TouchableOpacity onPress={() => setShowInfo(!showInfo)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="information-circle-outline" size={16} color={showInfo ? Colors.green : Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {showInfo && info && (
        <View style={fi.infoBubble}>
          <Ionicons name="bulb-outline" size={14} color={Colors.nutritionOrange} />
          <Text style={fi.infoText}>{info}</Text>
        </View>
      )}
      <TextInput
        {...props}
        style={[fi.input, focused && fi.inputFocused]}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      />
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: {},
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, marginTop: 14 },
  label: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  infoBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.nutritionSurface, borderRadius: Radius.md, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6 },
  infoText: { fontSize: 11, color: Colors.textSecondary, flex: 1, lineHeight: 16 },
  input: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body, borderWidth: 2, borderColor: 'transparent', outlineStyle: 'none' as any },
  inputFocused: { borderColor: Colors.green, backgroundColor: '#FFF' },
});

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const { register, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && success) {
      // Short delay to show success message
      const timer = setTimeout(() => {
        if (!user.onboarding_complete) router.replace('/(onboarding)/activities');
        else router.replace('/(tabs)/home');
      }, 1200);
      return () => clearTimeout(timer);
    } else if (user && !success) {
      if (!user.onboarding_complete) router.replace('/(onboarding)/activities');
      else router.replace('/(tabs)/home');
    }
  }, [user, success]);

  const handleRegister = async () => {
    const validationError = runValidations(
      validateName(firstName, 'First name'),
      validateName(lastName, 'Last name'),
      validateEmail(email),
      validatePassword(password),
      validateDateOfBirth(dob),
      validatePhone(phone),
    );
    if (validationError) { setError(validationError); return; }
    if (!agreedPrivacy) { setError('Please agree to the Privacy Policy to continue'); return; }

    setLoading(true); setError('');
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await register(fullName, email, password, {
        first_name: firstName,
        last_name: lastName,
        phone,
        date_of_birth: dob,
      });
      setSuccess(true);
    } catch (e: any) {
      if (e.response?.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (e.response?.data?.detail) {
        setError(e.response.data.detail);
      } else if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        setError('Connection timed out. Please check your internet and try again.');
      } else if (!e.response) {
        setError('No internet connection. Please check your network and try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  const canSubmit = agreedPrivacy && !!firstName.trim() && !!lastName.trim() && !!email.trim() && isPasswordValid(password);

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.successContent}>
            <LinearGradient colors={[Colors.green, Colors.greenDark]} style={styles.successCircle}>
              <Ionicons name="checkmark" size={40} color="#FFF" />
            </LinearGradient>
            <Text style={styles.successTitle}>Account Created!</Text>
            <Text style={styles.successSub}>Welcome to BO Wellness, {firstName}!</Text>
            <Text style={styles.successSub2}>Setting up your onboarding...</Text>
            <ActivityIndicator size="small" color={Colors.green} style={{ marginTop: 16 }} />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.logoSection}>
            <Image source={require('@/src/assets').boLogoColor} style={styles.logo} contentFit="contain" transition={200} />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your personalized wellness journey</Text>
          </Animated.View>

          {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View> : null}

          <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <FocusInput label="First Name" placeholder="First" placeholderTextColor={Colors.textTertiary} value={firstName} onChangeText={setFirstName} autoCapitalize="words" testID="register-first-name" />
              </View>
              <View style={{ flex: 1 }}>
                <FocusInput label="Last Name" placeholder="Last" placeholderTextColor={Colors.textTertiary} value={lastName} onChangeText={setLastName} autoCapitalize="words" testID="register-last-name" />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <FocusInput label="Email" info="We'll use this to verify your account and send important updates" placeholder="Enter your email" placeholderTextColor={Colors.textTertiary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="register-email-input" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(500)}>
            <FocusInput label="Phone Number (Optional)" info="Used for account recovery and meal delivery notifications" placeholder="+1 (555) 000-0000" placeholderTextColor={Colors.textTertiary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="register-phone-input" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <FocusInput label="Date of Birth (Optional)" info="Helps personalize calorie goals and nutrition recommendations based on your age" placeholder="MM/DD/YYYY" placeholderTextColor={Colors.textTertiary} value={dob} onChangeText={setDob} testID="register-dob-input" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(500)}>
            <FocusInput label="Password" info="Min 8 characters, with at least one uppercase letter, one number, and one special character (e.g. !@#$%)" placeholder="Min 8 characters" placeholderTextColor={Colors.textTertiary} value={password} onChangeText={setPassword} secureTextEntry testID="register-password-input" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(280).duration(500)}>
            <TouchableOpacity style={styles.privacyRow} onPress={() => setAgreedPrivacy(!agreedPrivacy)} activeOpacity={0.7}>
              <View style={[styles.checkbox, agreedPrivacy && styles.checkboxActive]}>
                {agreedPrivacy && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.privacyText}>
                I agree to the{' '}
                <Text style={styles.privacyLink} onPress={() => router.push('/(auth)/privacy-policy')}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {!agreedPrivacy && (
              <View style={styles.privacyHint}>
                <Ionicons name="shield-checkmark-outline" size={12} color={Colors.textTertiary} />
                <Text style={styles.privacyHintText}>You must accept the Privacy Policy to create an account</Text>
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(500)}>
            <TouchableOpacity testID="register-submit-button" onPress={handleRegister} disabled={loading || !canSubmit} activeOpacity={0.8}>
              <LinearGradient
                colors={canSubmit ? [Colors.lime, Colors.green] : [Colors.textTertiary, Colors.textTertiary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.button, !canSubmit && { opacity: 0.5 }]}
              >
                {loading ? <ActivityIndicator color={Colors.textPrimary} /> : <Text style={[styles.buttonText, !canSubmit && { color: '#FFF' }]}>Create Account</Text>}
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
  logoSection: { alignItems: 'center', marginBottom: Spacing.md },
  logo: { width: 80, height: 80, marginBottom: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, textAlign: 'center', marginTop: Spacing.xs },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  error: { color: Colors.danger, fontSize: FontSize.small, textAlign: 'center' },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  privacyText: { fontSize: FontSize.small, color: Colors.textSecondary, flex: 1 },
  privacyLink: { color: Colors.green, fontWeight: '700' },
  privacyHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingLeft: 36 },
  privacyHintText: { fontSize: 11, color: Colors.textTertiary, fontStyle: 'italic' },
  button: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.xl },
  buttonText: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700' },
  linkWrap: { marginTop: Spacing.lg, alignItems: 'center', paddingBottom: Spacing.xl },
  linkText: { color: Colors.textSecondary, fontSize: FontSize.body },
  linkBold: { color: Colors.green, fontWeight: '700' },
  // Success state
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successContent: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  successCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  successTitle: { fontSize: FontSize.h1, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  successSub: { fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  successSub2: { fontSize: FontSize.small, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.xs },
});
