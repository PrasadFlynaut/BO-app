import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '../../src/theme';

const GOALS = [
  { id: 'stay_fit', label: 'Stay Fit', icon: 'fitness-outline' as const, desc: 'Maintain a healthy body' },
  { id: 'lose_weight', label: 'Lose Weight', icon: 'trending-down-outline' as const, desc: 'Achieve your ideal weight' },
  { id: 'eat_healthy', label: 'Eat Healthy', icon: 'nutrition-outline' as const, desc: 'Improve your diet' },
  { id: 'be_active', label: 'Be Active', icon: 'walk-outline' as const, desc: 'Move more every day' },
  { id: 'build_muscle', label: 'Build Muscle', icon: 'barbell-outline' as const, desc: 'Increase strength' },
  { id: 'mental_wellness', label: 'Mental Wellness', icon: 'happy-outline' as const, desc: 'Reduce stress, be calm' },
];

export default function GoalsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.title}>What are your goals?</Text>
        <Text style={styles.subtitle}>Select all that apply to personalize your experience</Text>

        <View style={styles.grid}>
          {GOALS.map(g => {
            const active = selected.includes(g.id);
            return (
              <TouchableOpacity
                key={g.id}
                testID={`goal-${g.id}`}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => toggle(g.id)}
                activeOpacity={0.7}
              >
                <Ionicons name={g.icon} size={28} color={active ? Colors.secondary : Colors.textMuted} />
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>{g.label}</Text>
                <Text style={styles.cardDesc}>{g.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          testID="goals-continue-button"
          style={[styles.button, selected.length === 0 && styles.buttonDisabled]}
          onPress={() => router.push({ pathname: '/(onboarding)/dietary', params: { goals: JSON.stringify(selected) } })}
          disabled={selected.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xxl },
  step: { color: Colors.secondary, fontSize: FontSize.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '700', marginTop: Spacing.sm },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: { width: '47%', backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  cardActive: { borderColor: Colors.secondary, backgroundColor: 'rgba(219,255,2,0.05)' },
  cardLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '600', marginTop: Spacing.sm },
  cardLabelActive: { color: Colors.secondary },
  cardDesc: { color: Colors.textMuted, fontSize: FontSize.small, marginTop: 2 },
  button: { backgroundColor: Colors.secondary, borderRadius: Radius.md, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#000', fontSize: FontSize.body, fontWeight: '700' },
});
