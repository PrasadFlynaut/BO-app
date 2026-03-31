import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';

const GOALS = [
  { id: 'stay_fit', label: 'Stay Fit', icon: 'fitness-outline' as const, desc: 'Maintain a healthy body', color: Colors.green, bg: Colors.greenLight },
  { id: 'lose_weight', label: 'Lose Weight', icon: 'trending-down-outline' as const, desc: 'Achieve your ideal weight', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
  { id: 'eat_healthy', label: 'Eat Healthy', icon: 'nutrition-outline' as const, desc: 'Improve your diet', color: Colors.socialTeal, bg: Colors.socialSurface },
  { id: 'be_active', label: 'Be Active', icon: 'walk-outline' as const, desc: 'Move more every day', color: Colors.waterBlue, bg: Colors.waterSurface },
  { id: 'build_muscle', label: 'Build Muscle', icon: 'barbell-outline' as const, desc: 'Increase strength', color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
  { id: 'mental_wellness', label: 'Mental Wellness', icon: 'happy-outline' as const, desc: 'Reduce stress, be calm', color: '#FF5252', bg: '#FFF0F0' },
];

function GoalCard({ goal, active, onPress, index }: { goal: typeof GOALS[0]; active: boolean; onPress: () => void; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)} style={animStyle}>
      <TouchableOpacity
        testID={`goal-${goal.id}`}
        style={[styles.card, active && styles.cardActive, { borderColor: active ? goal.color : Colors.border }]}
        onPress={() => {
          scale.value = withSpring(0.95, { stiffness: 400, damping: 15 });
          setTimeout(() => { scale.value = withSpring(1, { stiffness: 300, damping: 15 }); }, 100);
          onPress();
        }}
        activeOpacity={0.85}
      >
        <View style={[styles.iconCircle, { backgroundColor: active ? goal.color + '20' : goal.bg }]}>
          <Ionicons name={goal.icon} size={24} color={active ? goal.color : Colors.textTertiary} />
        </View>
        <Text style={[styles.cardLabel, active && { color: goal.color }]}>{goal.label}</Text>
        <Text style={styles.cardDesc}>{goal.desc}</Text>
        {active && (
          <View style={[styles.checkBadge, { backgroundColor: goal.color }]}>
            <Ionicons name="checkmark" size={12} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function GoalsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient colors={[Colors.green + '15', 'transparent']} style={styles.stepBadge}>
            <Text style={styles.step}>Step 1 of 3</Text>
          </LinearGradient>
          <Text style={styles.title}>What are your goals?</Text>
          <Text style={styles.subtitle}>Select all that apply to personalize your experience</Text>
        </Animated.View>

        <View style={styles.grid}>
          {GOALS.map((g, i) => (
            <GoalCard key={g.id} goal={g} active={selected.includes(g.id)} onPress={() => toggle(g.id)} index={i} />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={btnAnimStyle}>
          <TouchableOpacity
            testID="goals-continue-button"
            onPress={() => {
              btnScale.value = withSpring(0.95, { stiffness: 400 });
              setTimeout(() => {
                btnScale.value = withSpring(1, { stiffness: 300 });
                router.push({ pathname: '/(onboarding)/dietary', params: { goals: JSON.stringify(selected) } });
              }, 150);
            }}
            disabled={selected.length === 0}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={selected.length === 0 ? [Colors.textTertiary, Colors.textTertiary] : [Colors.green, Colors.greenDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.button, Shadow.md]}
            >
              <Text style={styles.buttonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl },
  stepBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.pill, marginBottom: Spacing.md },
  step: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: {
    width: '47%',
    backgroundColor: Colors.bgBase,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardActive: { backgroundColor: Colors.bgBase },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  cardLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700' },
  cardDesc: { color: Colors.textTertiary, fontSize: FontSize.small, marginTop: 2, lineHeight: 18 },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
