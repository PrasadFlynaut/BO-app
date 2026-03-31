import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';

const DIETS = [
  { id: 'keto', label: 'Keto', icon: 'flame-outline' as const },
  { id: 'vegan', label: 'Vegan', icon: 'leaf-outline' as const },
  { id: 'mediterranean', label: 'Mediterranean', icon: 'heart-outline' as const },
  { id: 'clean_eating', label: 'Clean Eating', icon: 'sparkles-outline' as const },
  { id: 'high_protein', label: 'High Protein', icon: 'barbell-outline' as const },
  { id: 'balanced', label: 'Balanced', icon: 'scale-outline' as const },
];
const ALLERGIES = ['Gluten', 'Dairy', 'Nuts', 'Shellfish', 'Soy', 'Eggs', 'None'];

export default function DietaryScreen() {
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const toggleDiet = (id: string) => setDiets(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  const toggleAllergy = (a: string) => { if (a === 'None') { setAllergies(['None']); return; } setAllergies(prev => { const next = prev.filter(x => x !== 'None'); return next.includes(a) ? next.filter(x => x !== a) : [...next, a]; }); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>Dietary Preferences</Text>
        <Text style={styles.subtitle}>What type of diet interests you?</Text>
        <View style={styles.grid}>
          {DIETS.map(d => { const active = diets.includes(d.id); return (
            <TouchableOpacity key={d.id} testID={`diet-${d.id}`} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleDiet(d.id)} activeOpacity={0.7}>
              <Ionicons name={d.icon} size={20} color={active ? Colors.green : Colors.textMuted} /><Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ); })}
        </View>
        <Text style={styles.sectionTitle}>Any Allergies?</Text>
        <View style={styles.grid}>
          {ALLERGIES.map(a => { const active = allergies.includes(a); return (
            <TouchableOpacity key={a} testID={`allergy-${a}`} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleAllergy(a)} activeOpacity={0.7}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ); })}
        </View>
        <TouchableOpacity testID="dietary-continue-button" style={styles.button} onPress={() => router.push({ pathname: '/(onboarding)/health', params: { goals: params.goals as string, diets: JSON.stringify(diets), allergies: JSON.stringify(allergies) } })} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Continue</Text><Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xxl },
  step: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '700', marginTop: Spacing.sm },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '600', marginTop: Spacing.xl, marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.body, fontWeight: '500' },
  chipTextActive: { color: Colors.green },
  button: { backgroundColor: Colors.green, borderRadius: Radius.md, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
