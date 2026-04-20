import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import Constants from 'expo-constants';

const VERSION_HISTORY = [
  {
    version: '1.0.0',
    date: 'Apr 2, 2026',
    tag: 'Current',
    notes: [
      'Initial public release of BO wellness app',
      'AI-powered meal recommendations with nutritional tracking',
      'Happiness & mood tracking with custom animated emojis',
      'Wearable device sync (Apple Health, Google Fit, Fitbit, Samsung, Garmin)',
      'Embrace Connection: share posts, likes, and comments',
      'AI wellness chatbot for health Q&A',
      'Push notifications for meal reminders and wellness tips',
      'Restaurant discovery with BO verification',
      'Wellness programs with daily activities',
      'Water, sleep, walking, and workout tracking',
      'Stripe subscription with Pro plan features',
      'Enterprise admin panel with AI analytics',
    ],
  },
  {
    version: '0.9.0',
    date: 'Mar 15, 2026',
    tag: 'Beta',
    notes: [
      'Beta release with core tracking features',
      'Onboarding flow with health questionnaire',
      'Basic meal logging and recipe browsing',
      'Step counter integration via device pedometer',
      'User profile with goal setting',
    ],
  },
  {
    version: '0.5.0',
    date: 'Feb 1, 2026',
    tag: 'Alpha',
    notes: [
      'Internal alpha with authentication flow',
      'Basic UI framework and navigation',
      'MongoDB backend with REST API',
      'Initial meal database seeded',
    ],
  },
];

type Section = { icon: string; label: string; color: string; route?: string; sub?: string };
const SECTIONS: { title: string; items: Section[] }[] = [
  {
    title: 'ACCOUNT',
    items: [
      { icon: 'analytics-outline', label: 'My Progress', color: '#A855F7', route: '/progress', sub: 'Happiness trends & wellness history' },
      { icon: 'watch-outline', label: 'Connected Devices', color: Colors.waterBlue, route: '/connected-devices', sub: 'Sync health data from wearables' },
      { icon: 'notifications-outline', label: 'Notification Settings', color: Colors.nutritionOrange, route: '/notification-settings', sub: 'Manage reminders & alerts' },
      { icon: 'diamond-outline', label: 'Subscription Management', color: Colors.green, route: '/subscription', sub: 'View your plan & billing' },
    ],
  },
  {
    title: 'SOCIAL',
    items: [
      { icon: 'people-outline', label: 'Invite Your Friends', color: Colors.waterBlue, route: '/invite-friends', sub: 'Earn rewards for referrals' },
    ],
  },
  {
    title: 'FOR RESTAURANTS',
    items: [
      { icon: 'storefront-outline', label: 'Claim Your Restaurant', color: '#E53E3E', route: '/claim-restaurant', sub: 'Restaurant owners: verify your listing' },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { icon: 'help-circle-outline', label: 'Help and Support', color: Colors.socialTeal, route: '/help', sub: 'FAQs, tickets & live chat' },
      { icon: 'mail-outline', label: 'Contact Us', color: Colors.fitnessPurple, route: '/contact', sub: 'Reach our team directly' },
    ],
  },
  {
    title: 'LEGAL',
    items: [
      { icon: 'information-circle-outline', label: 'About BO', color: Colors.textSecondary, route: '/about', sub: 'Our mission & version info' },
      { icon: 'document-text-outline', label: 'Terms of Use', color: Colors.textSecondary, route: '/terms' },
      { icon: 'shield-checkmark-outline', label: 'Privacy Policy', color: Colors.textSecondary, route: '/privacy-screen' },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [showVersionModal, setShowVersionModal] = useState(false);
  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section, si) => (
          <Animated.View key={si} entering={FadeInDown.delay(si * 80).duration(350)}>
            <Text style={s.sectionHeader}>{section.title}</Text>
            <View style={s.sectionCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[s.row, ii < section.items.length - 1 && s.rowBorder]}
                  onPress={() => item.route && router.push(item.route as any)}
                  activeOpacity={0.6}
                >
                  <View style={s.rowLeft}>
                    <View style={[s.iconWrap, { backgroundColor: item.color + '18' }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <View>
                      <Text style={s.rowLabel}>{item.label}</Text>
                      {item.sub && <Text style={s.rowSub}>{item.sub}</Text>}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        ))}

        {/* Version Management Section */}
        <Animated.View entering={FadeInDown.delay(500).duration(350)}>
          <Text style={s.sectionHeader}>APP VERSION</Text>
          <View style={s.sectionCard}>
            <View style={[s.row, s.rowBorder]}>
              <View style={s.rowLeft}>
                <View style={[s.iconWrap, { backgroundColor: Colors.green + '18' }]}>
                  <Ionicons name="code-slash" size={20} color={Colors.green} />
                </View>
                <View>
                  <Text style={s.rowLabel}>Current Version</Text>
                  <Text style={s.rowSub}>v{currentVersion} (Build {buildNumber})</Text>
                </View>
              </View>
              <View style={s.currentBadge}>
                <Text style={s.currentBadgeText}>Latest</Text>
              </View>
            </View>
            <TouchableOpacity style={s.row} onPress={() => setShowVersionModal(true)} activeOpacity={0.6}>
              <View style={s.rowLeft}>
                <View style={[s.iconWrap, { backgroundColor: '#8B5CF618' }]}>
                  <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                </View>
                <View>
                  <Text style={s.rowLabel}>Version History</Text>
                  <Text style={s.rowSub}>Release notes & changelog</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <TouchableOpacity style={s.deleteLink} onPress={() => router.push('/account-delete' as any)}>
          <Text style={s.deleteLinkText}>Delete My Account</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Version History Modal */}
      <Modal visible={showVersionModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVersionModal(false)}>
        <SafeAreaView style={s.safe}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => setShowVersionModal(false)} style={s.backBtn}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Version History</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
            {VERSION_HISTORY.map((release, ri) => (
              <Animated.View key={ri} entering={FadeInDown.delay(ri * 100).duration(350)} style={[s.versionCard, Shadow.sm]}>
                <View style={s.versionHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.versionNumber}>v{release.version}</Text>
                      <View style={[s.tagBadge, release.tag === 'Current' ? { backgroundColor: Colors.greenLight } : release.tag === 'Beta' ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#F3F4F6' }]}>
                        <Text style={[s.tagText, release.tag === 'Current' ? { color: Colors.green } : release.tag === 'Beta' ? { color: '#D97706' } : { color: '#6B7280' }]}>{release.tag}</Text>
                      </View>
                    </View>
                    <Text style={s.versionDate}>{release.date}</Text>
                  </View>
                  {ri === 0 && <Ionicons name="checkmark-circle" size={24} color={Colors.green} />}
                </View>
                <View style={s.notesWrap}>
                  {release.notes.map((note, ni) => (
                    <View key={ni} style={s.noteRow}>
                      <View style={s.noteDot} />
                      <Text style={s.noteText}>{note}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  sectionHeader: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.sm, marginLeft: Spacing.lg },
  sectionCard: { backgroundColor: '#FFF', marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, minHeight: 56, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: FontSize.body, color: '#1A1A1A', fontWeight: '500' },
  rowSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  deleteLink: { marginTop: Spacing.xl, alignItems: 'center', paddingVertical: Spacing.md },
  deleteLinkText: { fontSize: 14, color: '#E53E3E', fontWeight: '500' },
  currentBadge: { backgroundColor: Colors.greenLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  currentBadgeText: { fontSize: 11, color: Colors.green, fontWeight: '700' },
  versionCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  versionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  versionNumber: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  versionDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  tagText: { fontSize: 11, fontWeight: '700' },
  notesWrap: { gap: 8 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green, marginTop: 7 },
  noteText: { fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
});
