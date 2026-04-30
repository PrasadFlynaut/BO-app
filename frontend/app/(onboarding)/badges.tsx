import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import OnboardingProgress from '@/src/components/OnboardingProgress';

const BADGES = [
  { icon: 'trophy', label: 'First Steps', desc: 'Complete your onboarding', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
  { icon: 'flame', label: 'Streak Master', desc: 'Log meals for 7 days straight', color: '#FF5252', bg: '#FFF0F0' },
  { icon: 'water', label: 'Hydration Hero', desc: 'Hit your water goal 5 days', color: Colors.waterBlue, bg: Colors.waterSurface },
  { icon: 'leaf', label: 'Clean Eater', desc: 'Follow a diet plan for 14 days', color: Colors.green, bg: Colors.greenLight },
  { icon: 'medal', label: 'Goal Crusher', desc: 'Reach your target weight', color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
  { icon: 'people', label: 'Community Star', desc: 'Share 10 posts in the feed', color: Colors.socialTeal, bg: Colors.socialSurface },
];

export default function BadgesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <OnboardingProgress step={2} />
          <Text style={st.title}>Earn Badges</Text>
          <Text style={st.subtitle}>Complete challenges to earn rewards and track your progress</Text>
        </Animated.View>

        <View style={st.grid}>
          {BADGES.map((b, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 80).duration(400)} style={st.badgeCard}>
              <View style={[st.badgeIcon, { backgroundColor: b.bg }]}>
                <Ionicons name={b.icon as any} size={28} color={b.color} />
              </View>
              <Text style={st.badgeLabel}>{b.label}</Text>
              <Text style={st.badgeDesc}>{b.desc}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <TouchableOpacity testID="badges-continue" onPress={() => router.push('/(onboarding)/happiness')} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.nutritionOrange, '#E88A10']} style={[st.button, Shadow.md]}>
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
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  badgeCard: { width: '47%' as any, backgroundColor: Colors.bgBase, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center' },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  badgeLabel: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  badgeDesc: { fontSize: FontSize.caption, color: Colors.textTertiary, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
