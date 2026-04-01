import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';

type ContactCard = { icon: string; title: string; subtitle: string; color: string; bg: string; action: () => void };

export default function ContactScreen() {
  const router = useRouter();

  const cards: ContactCard[] = [
    { icon: 'mail-outline', title: 'Email Us', subtitle: 'support@bo.app', color: Colors.waterBlue, bg: Colors.waterSurface, action: () => Linking.openURL('mailto:support@bo.app?subject=BO App Support Request') },
    { icon: 'chatbubbles-outline', title: 'Chat with Support', subtitle: 'Create a support ticket', color: Colors.green, bg: Colors.greenLight, action: () => router.push('/help' as any) },
    { icon: 'help-circle-outline', title: 'Browse FAQs', subtitle: 'Find answers quickly', color: Colors.socialTeal, bg: Colors.socialSurface, action: () => router.push('/help' as any) },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Contact Us</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {cards.map((card, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(i * 80).duration(350)}>
            <TouchableOpacity style={[s.card, Shadow.sm]} onPress={card.action} activeOpacity={0.7}>
              <View style={[s.cardIcon, { backgroundColor: card.bg }]}>
                <Ionicons name={card.icon as any} size={24} color={card.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{card.title}</Text>
                <Text style={s.cardSub}>{card.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Social links */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)}>
          <Text style={s.sectionLabel}>Follow Us</Text>
          <View style={s.socialRow}>
            {[
              { icon: 'logo-instagram', color: '#E1306C', url: 'https://instagram.com/boapp' },
              { icon: 'logo-facebook', color: '#1877F2', url: 'https://facebook.com/boapp' },
              { icon: 'logo-twitter', color: '#1DA1F2', url: 'https://x.com/boapp' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.socialBtn} onPress={() => Linking.openURL(item.url)}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(350)} style={s.hoursCard}>
          <Ionicons name="time-outline" size={18} color={Colors.textTertiary} />
          <Text style={s.hoursText}>Our team responds within 24 hours on business days.</Text>
        </Animated.View>
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
  body: { padding: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: 14 },
  cardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textPrimary },
  cardSub: { fontSize: FontSize.small, color: Colors.textTertiary, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.sm, marginLeft: 4 },
  socialRow: { flexDirection: 'row', gap: 16, marginBottom: Spacing.lg },
  socialBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  hoursCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md },
  hoursText: { fontSize: FontSize.small, color: Colors.textTertiary, flex: 1 },
});
