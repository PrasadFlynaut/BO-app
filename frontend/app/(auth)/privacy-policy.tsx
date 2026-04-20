import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';

const SECTIONS = [
  { title: '1. Information We Collect', body: 'We collect personal information you provide during registration, including your name, email address, date of birth, and phone number. We also collect health-related data such as dietary preferences, fitness goals, weight, and activity levels that you voluntarily enter to personalize your experience.' },
  { title: '2. How We Use Your Information', body: 'Your information is used to provide personalized Meal Planter recommendations, nutrition tracking, and wellness guidance. We use aggregated, de-identified data to improve our services. We do not sell your personal information to third parties.' },
  { title: '3. Data Security', body: 'We implement industry-standard security measures including encryption at rest and in transit, secure token-based authentication, and regular security audits. Health-related data is stored with additional safeguards in compliance with applicable regulations.' },
  { title: '4. HIPAA Compliance', body: 'Any health information you provide is treated as Protected Health Information (PHI) under HIPAA guidelines. We maintain appropriate administrative, physical, and technical safeguards to protect the privacy and security of your health data.' },
  { title: '5. Your Rights', body: 'You have the right to access, update, or delete your personal data at any time through the app settings. You may also request a copy of your data or opt out of data personalization features.' },
  { title: '6. Third-Party Services', body: 'We may use third-party services for analytics and cloud infrastructure. These partners are contractually obligated to protect your data and use it only for the purposes we specify.' },
  { title: '7. Data Retention', body: 'We retain your data for as long as your account is active. Upon account deletion, your data is permanently removed within 30 days, except where retention is required by law.' },
  { title: '8. Changes to This Policy', body: 'We may update this privacy policy from time to time. We will notify you of significant changes through the app or via email. Continued use after changes constitutes acceptance.' },
  { title: '9. Contact Us', body: 'If you have questions about this privacy policy or our data practices, please contact us at privacy@boapp.com.' },
];

export default function PrivacyPolicyScreen() {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const router = useRouter();

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    if (isEnd) setScrolledToEnd(true);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.content} onScroll={handleScroll} scrollEventThrottle={200} showsVerticalScrollIndicator={false}>
        <View style={s.badge}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.green} />
          <Text style={s.badgeText}>BO Wellness Privacy Policy</Text>
        </View>
        <Text style={s.lastUpdated}>Last updated: March 31, 2026</Text>
        <Text style={s.intro}>At BO (Bananas and Okra), we are committed to protecting your privacy and ensuring the security of your personal health information. This policy describes how we collect, use, and safeguard your data.</Text>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <Text style={s.sectionBody}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={{ width: '100%' }}>
          <LinearGradient colors={[Colors.green, Colors.greenDark]} style={[s.agreeBtn, Shadow.md]}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={s.agreeBtnText}>I Agree</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.greenLight, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, alignSelf: 'flex-start', marginBottom: Spacing.md },
  badgeText: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.green },
  lastUpdated: { fontSize: FontSize.caption, color: Colors.textTertiary, marginBottom: Spacing.lg },
  intro: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 24, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionBody: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 22 },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  agreeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, paddingVertical: 18 },
  agreeBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
