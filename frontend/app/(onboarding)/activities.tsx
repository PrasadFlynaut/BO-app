import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

const ACTIVITIES = [
  { id: 'walking', label: 'Walking', icon: 'walk-outline' as const, desc: 'Daily walks for overall health', color: Colors.green, bg: Colors.greenLight },
  { id: 'cycling', label: 'Cycling', icon: 'bicycle-outline' as const, desc: 'Build endurance on two wheels', color: Colors.waterBlue, bg: Colors.waterSurface },
  { id: 'swimming', label: 'Swimming', icon: 'water-outline' as const, desc: 'Full-body low-impact exercise', color: Colors.socialTeal, bg: Colors.socialSurface },
  { id: 'running', label: 'Running', icon: 'fitness-outline' as const, desc: 'Boost cardio and stamina', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
];

export default function ActivitiesScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleContinue = async () => {
    try { await api.post('/onboarding/activities', { activities: selected, fitness_goals: [] }); } catch (e) { console.error(e); }
    router.push('/(onboarding)/badges');
  };

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient colors={[Colors.green + '15', 'transparent']} style={st.stepBadge}>
            <Text style={st.step}>Step 1 of 8</Text>
          </LinearGradient>
          <Text style={st.title}>Set Your Goals</Text>
          <Text style={st.subtitle}>What activities do you enjoy?</Text>
        </Animated.View>

        {ACTIVITIES.map((a, i) => {
          const active = selected.includes(a.id);
          return (
            <Animated.View key={a.id} entering={FadeInDown.delay(i * 80).duration(400)}>
              <TouchableOpacity testID={`activity-${a.id}`} style={[st.card, active && { borderColor: a.color, backgroundColor: a.bg }]} onPress={() => toggle(a.id)} activeOpacity={0.7}>
                <View style={[st.iconCircle, { backgroundColor: active ? a.color + '20' : a.bg }]}>
                  <Ionicons name={a.icon} size={28} color={active ? a.color : Colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.cardLabel, active && { color: a.color }]}>{a.label}</Text>
                  <Text style={st.cardDesc}>{a.desc}</Text>
                </View>
                {active && <View style={[st.checkBadge, { backgroundColor: a.color }]}><Ionicons name="checkmark" size={14} color="#FFF" /></View>}
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={btnAnimStyle}>
          <TouchableOpacity testID="activities-continue" onPress={handleContinue} disabled={selected.length === 0} activeOpacity={0.9}>
            <LinearGradient colors={selected.length === 0 ? [Colors.textTertiary, Colors.textTertiary] : [Colors.green, Colors.greenDark]} style={[st.button, Shadow.md]}>
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
  stepBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.pill, marginBottom: Spacing.md },
  step: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgBase, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1.5, borderColor: Colors.borderLight },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700' },
  cardDesc: { color: Colors.textTertiary, fontSize: FontSize.small, marginTop: 2 },
  checkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
