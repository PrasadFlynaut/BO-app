import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';

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

        <TouchableOpacity style={s.deleteLink} onPress={() => router.push('/account-delete' as any)}>
          <Text style={s.deleteLinkText}>Delete My Account</Text>
        </TouchableOpacity>
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
});
