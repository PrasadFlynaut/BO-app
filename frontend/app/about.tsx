import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import Constants from 'expo-constants';

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(350)} style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>BO</Text>
          </View>
          <Text style={s.appName}>BO</Text>
          <Text style={s.tagline}>for your health on the go</Text>
          <View style={s.versionBadge}>
            <Text style={s.versionText}>Version {version}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={[s.card, Shadow.sm]}>
          <Text style={s.description}>
            BO was inspired by two matriarchs and stands for Bananas and Okra. Our mission is to help you discover your healthiest self through personalized nutrition, activity tracking, and a supportive community.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(350)} style={[s.card, Shadow.sm]}>
          <Text style={s.creditsTitle}>Built By</Text>
          <Text style={s.creditsName}>Flynaut LLC</Text>
          <Text style={s.creditsSub}>Powered by Expo and React Native</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(350)} style={s.socialRow}>
          {[
            { icon: 'globe-outline', url: 'https://bo.app' },
            { icon: 'logo-instagram', url: 'https://instagram.com/boapp' },
            { icon: 'logo-facebook', url: 'https://facebook.com/boapp' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.socialBtn} onPress={() => Linking.openURL(item.url)}>
              <Ionicons name={item.icon as any} size={22} color={Colors.green} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        <Text style={s.copyright}>2026 BO. All rights reserved.</Text>
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
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  appName: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary },
  tagline: { fontSize: FontSize.body, color: '#666666', marginTop: 4 },
  versionBadge: { marginTop: 8, backgroundColor: Colors.greenLight, paddingHorizontal: 14, paddingVertical: 4, borderRadius: Radius.pill },
  versionText: { fontSize: FontSize.caption, color: Colors.green, fontWeight: '600' },
  card: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, width: '100%' },
  description: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 24 },
  creditsTitle: { fontSize: FontSize.caption, color: '#9CA3AF', fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  creditsName: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  creditsSub: { fontSize: FontSize.small, color: Colors.textTertiary, marginTop: 4 },
  socialRow: { flexDirection: 'row', gap: 16, marginVertical: Spacing.md },
  socialBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  copyright: { fontSize: FontSize.caption, color: '#9CA3AF', marginTop: Spacing.sm },
});
