import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';
import OnboardingProgress from '@/src/components/OnboardingProgress';

const PERMISSIONS = [
  {
    id: 'push_notifications',
    label: 'Push Notifications',
    desc: 'Get reminders for meals, water, and goals',
    icon: 'notifications-outline' as const,
    color: Colors.nutritionOrange,
  },
  {
    id: 'gallery_access',
    label: 'Photo Gallery',
    desc: 'Upload photos for recipes and posts',
    icon: 'images-outline' as const,
    color: Colors.waterBlue,
  },
  {
    id: 'location_sharing',
    label: 'Location',
    desc: 'Discover nearby restaurants and wellness spots',
    icon: 'location-outline' as const,
    color: Colors.green,
  },
  {
    id: 'data_personalization_consent',
    label: 'Data Personalization',
    desc: 'Use your data to personalize recommendations',
    icon: 'analytics-outline' as const,
    color: Colors.fitnessPurple,
  },
];

async function requestNativePermission(id: string): Promise<boolean> {
  if (id === 'push_notifications') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  if (id === 'gallery_access') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }
  if (id === 'location_sharing') {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }
  // data_personalization_consent is a consent toggle — no OS permission needed
  return true;
}

export default function PermissionsScreen() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [denied, setDenied] = useState<Record<string, boolean>>({});
  const [hipaaAccepted, setHipaaAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const router = useRouter();

  const handleToggle = async (id: string) => {
    if (enabled[id]) {
      // Turn off — just update local state (can't revoke OS permissions programmatically)
      setEnabled(prev => ({ ...prev, [id]: false }));
      return;
    }
    const granted = await requestNativePermission(id);
    setEnabled(prev => ({ ...prev, [id]: granted }));
    if (!granted) {
      setDenied(prev => ({ ...prev, [id]: true }));
    }
  };

  const handleContinue = async () => {
    try {
      await api.put('/onboarding/permissions', {
        push_notifications: !!enabled.push_notifications,
        gallery_access: !!enabled.gallery_access,
        location_sharing: !!enabled.location_sharing,
        data_personalization_consent: !!enabled.data_personalization_consent,
        privacy_policy_accepted: privacyAccepted,
      });
    } catch (e) { console.error(e); }
    router.push('/(onboarding)/complete');
  };

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <OnboardingProgress step={7} />
          <Text style={st.title}>Permissions</Text>
          <Text style={st.subtitle}>Grant access for the best experience</Text>
        </Animated.View>

        {PERMISSIONS.map((p, i) => (
          <Animated.View key={p.id} entering={FadeInDown.delay(i * 80).duration(400)}>
            <TouchableOpacity
              style={[st.permRow, enabled[p.id] && { borderColor: p.color, backgroundColor: p.color + '08' }]}
              onPress={() => handleToggle(p.id)}
              activeOpacity={0.7}
            >
              <View style={[st.permIcon, { backgroundColor: p.color + '15' }]}>
                <Ionicons name={p.icon} size={22} color={p.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.permLabel}>{p.label}</Text>
                <Text style={st.permDesc}>{p.desc}</Text>
                {denied[p.id] && !enabled[p.id] && (
                  <TouchableOpacity onPress={() => Linking.openSettings()} activeOpacity={0.7}>
                    <Text style={st.deniedHint}>Permission denied — tap to open Settings</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[st.toggleSwitch, enabled[p.id] && { backgroundColor: p.color }]}>
                <Ionicons
                  name={enabled[p.id] ? 'checkmark' : 'close'}
                  size={14}
                  color={enabled[p.id] ? '#FFF' : Colors.textTertiary}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <View style={st.disclaimerBox}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.green} />
            <View style={{ flex: 1 }}>
              <Text style={st.disclaimerTitle}>HIPAA Compliance</Text>
              <Text style={st.disclaimerText}>Your health data is encrypted and protected under HIPAA guidelines. We never share your personal health information.</Text>
            </View>
          </View>
          <TouchableOpacity style={st.checkRow} onPress={() => setHipaaAccepted(!hipaaAccepted)} activeOpacity={0.7}>
            <View style={[st.checkbox, hipaaAccepted && st.checkboxActive]}>
              {hipaaAccepted && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <Text style={st.checkLabel}>I acknowledge the HIPAA disclaimer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.checkRow} onPress={() => setPrivacyAccepted(!privacyAccepted)} activeOpacity={0.7}>
            <View style={[st.checkbox, privacyAccepted && st.checkboxActive]}>
              {privacyAccepted && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <Text style={st.checkLabel}>I agree to the Privacy Policy</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <TouchableOpacity
            testID="permissions-continue"
            onPress={handleContinue}
            disabled={!hipaaAccepted || !privacyAccepted}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={(!hipaaAccepted || !privacyAccepted) ? [Colors.textTertiary, Colors.textTertiary] : [Colors.nutritionOrange, '#E88A10']}
              style={[st.button, Shadow.md]}
            >
              <Text style={st.buttonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 24 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgBase },
  permIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  permLabel: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  permDesc: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  deniedHint: { fontSize: 11, color: Colors.danger, marginTop: 4, fontWeight: '500' },
  toggleSwitch: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  disclaimerBox: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.greenLight, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.xl },
  disclaimerTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.green },
  disclaimerText: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20, marginTop: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  checkLabel: { fontSize: FontSize.small, color: Colors.textPrimary, fontWeight: '600' },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
