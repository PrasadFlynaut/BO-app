import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import Constants from 'expo-constants';

const boLogo = require('../assets/images/bo-logo-color.png');

const COMPLIANCE_ITEMS = [
  {
    icon: 'shield-checkmark',
    title: 'GDPR Compliant',
    desc: 'Full compliance with EU General Data Protection Regulation. Users can request data export or deletion at any time.',
    color: '#3B82F6',
  },
  {
    icon: 'lock-closed',
    title: 'CCPA Compliant',
    desc: 'Adheres to California Consumer Privacy Act. Transparent data collection with opt-out rights for data selling.',
    color: '#8B5CF6',
  },
  {
    icon: 'medkit',
    title: 'HIPAA Aware',
    desc: 'Health data is handled following HIPAA best practices. PHI is encrypted at rest and in transit using AES-256.',
    color: '#EF4444',
  },
  {
    icon: 'server',
    title: 'SOC 2 Type II',
    desc: 'Infrastructure hosted on SOC 2 Type II certified cloud providers ensuring security, availability, and confidentiality.',
    color: '#10B981',
  },
  {
    icon: 'key',
    title: 'End-to-End Encryption',
    desc: 'All data transmitted via TLS 1.3. Sensitive health data encrypted at rest with AES-256-GCM. API keys rotated regularly.',
    color: '#F59E0B',
  },
  {
    icon: 'finger-print',
    title: 'Biometric Authentication',
    desc: 'Supports Face ID, Touch ID, and device biometrics for secure access. No biometric data leaves your device.',
    color: '#EC4899',
  },
];

const DATA_PRACTICES = [
  { icon: 'eye-off-outline', text: 'We never sell your personal data to third parties' },
  { icon: 'cloud-upload-outline', text: 'Health data is stored in encrypted cloud databases' },
  { icon: 'trash-outline', text: 'Request full data deletion anytime from Settings' },
  { icon: 'download-outline', text: 'Export all your data in machine-readable formats' },
  { icon: 'location-outline', text: 'Location data is only used when you grant permission' },
  { icon: 'analytics-outline', text: 'Anonymous analytics help us improve the app experience' },
];

const CERTIFICATIONS = [
  { name: 'ISO 27001', desc: 'Information Security' },
  { name: 'OWASP', desc: 'Mobile Security Standards' },
  { name: 'App Store', desc: 'Review Guidelines' },
  { name: 'Play Store', desc: 'Policy Compliance' },
];

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About BO</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Logo & Brand */}
        <Animated.View entering={FadeInDown.duration(350)} style={s.logoWrap}>
          <Image source={boLogo} style={s.logoImg} contentFit="contain" />
          <Text style={s.appName}>BO</Text>
          <Text style={s.tagline}>Your Health, On The Go</Text>
          <View style={s.versionBadge}>
            <Text style={s.versionText}>Version {version} (Build {buildNumber})</Text>
          </View>
        </Animated.View>

        {/* Mission */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)} style={[s.card, Shadow.sm]}>
          <Text style={s.sectionTitle}>Our Mission</Text>
          <Text style={s.description}>
            BO was inspired by two matriarchs and stands for Bananas and Okra. We help you discover your healthiest self through personalized nutrition, smart activity tracking, AI-powered wellness insights, and a supportive community, all in one app.
          </Text>
        </Animated.View>

        {/* Compliance & Security */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)} style={[s.card, Shadow.sm]}>
          <View style={s.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.green} />
            <Text style={s.sectionTitle}>Security & Compliance</Text>
          </View>
          <Text style={s.sectionSub}>Your data protection is our top priority</Text>
          {COMPLIANCE_ITEMS.map((item, i) => (
            <View key={i} style={s.complianceItem}>
              <View style={[s.complianceIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.complianceTitle}>{item.title}</Text>
                <Text style={s.complianceDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Data Practices */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)} style={[s.card, Shadow.sm]}>
          <View style={s.sectionHeader}>
            <Ionicons name="document-text" size={20} color={Colors.green} />
            <Text style={s.sectionTitle}>Data Practices</Text>
          </View>
          {DATA_PRACTICES.map((item, i) => (
            <View key={i} style={s.dataRow}>
              <Ionicons name={item.icon as any} size={18} color={Colors.green} />
              <Text style={s.dataText}>{item.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Certifications */}
        <Animated.View entering={FadeInDown.delay(320).duration(350)} style={[s.card, Shadow.sm]}>
          <View style={s.sectionHeader}>
            <Ionicons name="ribbon" size={20} color={Colors.green} />
            <Text style={s.sectionTitle}>Standards & Certifications</Text>
          </View>
          <View style={s.certGrid}>
            {CERTIFICATIONS.map((c, i) => (
              <View key={i} style={s.certItem}>
                <View style={s.certBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                </View>
                <Text style={s.certName}>{c.name}</Text>
                <Text style={s.certDesc}>{c.desc}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Built By */}
        <Animated.View entering={FadeInDown.delay(400).duration(350)} style={[s.card, Shadow.sm]}>
          <Text style={s.creditsLabel}>BUILT BY</Text>
          <Text style={s.creditsName}>Flynaut LLC</Text>
          <Text style={s.creditsSub}>Powered by Expo, React Native & AI</Text>
        </Animated.View>

        {/* Social Links */}
        <Animated.View entering={FadeInDown.delay(480).duration(350)} style={s.socialRow}>
          {[
            { icon: 'globe-outline', url: 'https://bo.app', label: 'Website' },
            { icon: 'logo-instagram', url: 'https://instagram.com/boapp', label: 'Instagram' },
            { icon: 'logo-facebook', url: 'https://facebook.com/boapp', label: 'Facebook' },
            { icon: 'logo-twitter', url: 'https://twitter.com/boapp', label: 'Twitter' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.socialBtn} onPress={() => Linking.openURL(item.url)}>
              <Ionicons name={item.icon as any} size={20} color={Colors.green} />
              <Text style={s.socialLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Legal Links */}
        <Animated.View entering={FadeInDown.delay(560).duration(350)} style={{ width: '100%', marginBottom: 12 }}>
          <TouchableOpacity style={s.legalRow} onPress={() => router.push('/privacy-screen')}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textTertiary} />
            <Text style={s.legalText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.legalRow} onPress={() => router.push('/terms')}>
            <Ionicons name="reader-outline" size={18} color={Colors.textTertiary} />
            <Text style={s.legalText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.legalRow} onPress={() => Linking.openURL('mailto:support@bo.app')}>
            <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} />
            <Text style={s.legalText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>

        <Text style={s.copyright}>{'\u00A9'} 2026 BO by Flynaut LLC. All rights reserved.</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  body: { alignItems: 'center', padding: Spacing.lg },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  logoImg: { width: 80, height: 80, marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary },
  tagline: { fontSize: FontSize.body, color: '#666666', marginTop: 4 },
  versionBadge: { marginTop: 8, backgroundColor: Colors.greenLight, paddingHorizontal: 14, paddingVertical: 4, borderRadius: Radius.pill },
  versionText: { fontSize: FontSize.caption, color: Colors.green, fontWeight: '600' },
  card: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, width: '100%' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  sectionSub: { fontSize: FontSize.small, color: Colors.textTertiary, marginBottom: 16 },
  description: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 24 },
  complianceItem: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  complianceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  complianceTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  complianceDesc: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dataText: { fontSize: FontSize.body, color: Colors.textSecondary, flex: 1 },
  certGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  certItem: { width: '46%', padding: 14, backgroundColor: '#F9FAFB', borderRadius: Radius.md, alignItems: 'center' },
  certBadge: { marginBottom: 6 },
  certName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  certDesc: { fontSize: FontSize.caption, color: Colors.textTertiary, textAlign: 'center', marginTop: 2 },
  creditsLabel: { fontSize: FontSize.caption, color: '#9CA3AF', fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  creditsName: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  creditsSub: { fontSize: FontSize.small, color: Colors.textTertiary, marginTop: 4 },
  socialRow: { flexDirection: 'row', gap: 12, marginVertical: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.greenLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill },
  socialLabel: { fontSize: FontSize.small, color: Colors.green, fontWeight: '600' },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  legalText: { fontSize: FontSize.body, color: Colors.textSecondary, flex: 1 },
  copyright: { fontSize: FontSize.caption, color: '#9CA3AF', marginTop: Spacing.sm },
});
