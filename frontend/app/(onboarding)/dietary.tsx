import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';
import OnboardingProgress from '@/src/components/OnboardingProgress';

const DIETS = [
  { id: 'keto', label: 'Keto', icon: 'flame-outline' as const, color: '#FF6B35', bg: Colors.nutritionSurface },
  { id: 'vegan', label: 'Vegan', icon: 'leaf-outline' as const, color: Colors.green, bg: Colors.greenLight },
  { id: 'mediterranean', label: 'Mediterranean', icon: 'heart-outline' as const, color: Colors.socialTeal, bg: Colors.socialSurface },
  { id: 'clean_eating', label: 'Clean Eating', icon: 'sparkles-outline' as const, color: Colors.waterBlue, bg: Colors.waterSurface },
  { id: 'high_protein', label: 'High Protein', icon: 'barbell-outline' as const, color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
  { id: 'balanced', label: 'Balanced', icon: 'scale-outline' as const, color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
];

const ALLERGIES = [
  { label: 'Gluten', icon: 'ban-outline' as const },
  { label: 'Dairy', icon: 'water-outline' as const },
  { label: 'Nuts', icon: 'ellipse-outline' as const },
  { label: 'Shellfish', icon: 'fish-outline' as const },
  { label: 'Soy', icon: 'leaf-outline' as const },
  { label: 'Eggs', icon: 'egg-outline' as const },
  { label: 'None', icon: 'checkmark-circle-outline' as const },
];

export default function DietaryScreen() {
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const router = useRouter();
  const toggleDiet = (id: string) => setDiets(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  const toggleAllergy = (a: string) => {
    if (a === 'None') { setAllergies(['None']); return; }
    setAllergies(prev => {
      const next = prev.filter(x => x !== 'None');
      return next.includes(a) ? next.filter(x => x !== a) : [...next, a];
    });
  };
  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const canContinue = diets.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <OnboardingProgress step={4} />
          <Text style={styles.title}>Dietary Preferences</Text>
          <Text style={styles.subtitle}>What type of diet interests you?</Text>
        </Animated.View>

        <View style={styles.grid}>
          {DIETS.map((d, i) => {
            const active = diets.includes(d.id);
            return (
              <Animated.View key={d.id} entering={FadeInDown.delay(i * 70).duration(400)}>
                <TouchableOpacity
                  testID={`diet-${d.id}`}
                  style={[styles.dietCard, active && { borderColor: d.color, backgroundColor: d.bg }]}
                  onPress={() => toggleDiet(d.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dietIconCircle, { backgroundColor: active ? d.color + '20' : d.bg }]}>
                    <Ionicons name={d.icon} size={22} color={active ? d.color : Colors.textTertiary} />
                  </View>
                  <Text style={[styles.dietLabel, active && { color: d.color }]}>{d.label}</Text>
                  {active && (
                    <View style={[styles.checkMark, { backgroundColor: d.color }]}>
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <View style={styles.allergyHeader}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.nutritionOrange} />
            <Text style={styles.sectionTitle}>Any Allergies?</Text>
          </View>
        </Animated.View>

        <View style={styles.allergyGrid}>
          {ALLERGIES.map((a, i) => {
            const active = allergies.includes(a.label);
            return (
              <Animated.View key={a.label} entering={FadeInDown.delay(600 + i * 60).duration(300)}>
                <TouchableOpacity
                  testID={`allergy-${a.label}`}
                  style={[styles.allergyChip, active && styles.allergyChipActive]}
                  onPress={() => toggleAllergy(a.label)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={a.icon} size={16} color={active ? Colors.green : Colors.textTertiary} />
                  <Text style={[styles.allergyText, active && styles.allergyTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View entering={FadeInDown.delay(800).duration(500)} style={btnAnimStyle}>
          <TouchableOpacity
            testID="dietary-continue-button"
            disabled={!canContinue}
            onPress={() => {
              btnScale.value = withSpring(0.95, { stiffness: 400 });
              setTimeout(async () => {
                btnScale.value = withSpring(1, { stiffness: 300 });
                try {
                  await api.put('/onboarding/preferences', { meal_preferences: diets, allergies });
                } catch (e) { console.error(e); }
                router.push('/(onboarding)/questionnaire');
              }, 150);
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canContinue ? [Colors.nutritionOrange, '#E88A10'] : [Colors.textTertiary, Colors.textTertiary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.button, Shadow.md, !canContinue && { opacity: 0.5 }]}
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
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.lg, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dietCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.bgBase,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  dietIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dietLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '600', flex: 1 },
  checkMark: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  allergyHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '700' },
  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgBase,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  allergyChipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  allergyText: { color: Colors.textSecondary, fontSize: FontSize.small, fontWeight: '500' },
  allergyTextActive: { color: Colors.green, fontWeight: '600' },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl, marginBottom: Spacing.lg },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
