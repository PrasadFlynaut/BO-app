import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

const ASPIRATIONS = [
  { id: 'tone', label: 'Tone Up', icon: 'body-outline' as const, color: Colors.green, bg: Colors.greenLight },
  { id: 'build_stamina', label: 'Build Stamina', icon: 'flash-outline' as const, color: Colors.waterBlue, bg: Colors.waterSurface },
  { id: 'increase_gains', label: 'Increase Gains', icon: 'barbell-outline' as const, color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
];

export default function HappinessScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [review, setReview] = useState('');
  const router = useRouter();
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const handleContinue = async () => {
    try {
      await api.put('/onboarding/life-goals', { life_goals: [], happiness_level: 5, review_text: review });
      await api.post('/onboarding/activities', { activities: [], fitness_goals: selected });
    } catch (e) { console.error(e); }
    router.push('/(onboarding)/dietary');
  };

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient colors={[Colors.fitnessPurple + '15', 'transparent']} style={st.stepBadge}>
            <Text style={st.step}>Step 3 of 8</Text>
          </LinearGradient>
          <Text style={st.title}>Fitness Goals</Text>
          <Text style={st.subtitle}>What do you want to achieve?</Text>
        </Animated.View>

        {ASPIRATIONS.map((a, i) => {
          const active = selected.includes(a.id);
          return (
            <Animated.View key={a.id} entering={FadeInDown.delay(i * 80).duration(400)}>
              <TouchableOpacity testID={`aspiration-${a.id}`} style={[st.card, active && { borderColor: a.color, backgroundColor: a.bg }]} onPress={() => toggle(a.id)} activeOpacity={0.7}>
                <View style={[st.iconCircle, { backgroundColor: active ? a.color + '20' : a.bg }]}>
                  <Ionicons name={a.icon} size={28} color={active ? a.color : Colors.textTertiary} />
                </View>
                <Text style={[st.cardLabel, active && { color: a.color }]}>{a.label}</Text>
                {active && <View style={[st.checkBadge, { backgroundColor: a.color }]}><Ionicons name="checkmark" size={14} color="#FFF" /></View>}
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text style={st.reviewLabel}>Share your expectations (optional)</Text>
          <TextInput style={st.reviewInput} placeholder="What are your health journey expectations?" placeholderTextColor={Colors.textTertiary} value={review} onChangeText={setReview} multiline numberOfLines={3} textAlignVertical="top" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <TouchableOpacity testID="happiness-continue" onPress={handleContinue} disabled={selected.length === 0} activeOpacity={0.9}>
            <LinearGradient colors={selected.length === 0 ? [Colors.textTertiary, Colors.textTertiary] : [Colors.fitnessPurple, '#6B2DC0']} style={[st.button, Shadow.md]}>
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
  step: { color: Colors.fitnessPurple, fontSize: FontSize.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgBase, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1.5, borderColor: Colors.borderLight },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700' },
  checkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewLabel: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginTop: Spacing.xl, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  reviewInput: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body, minHeight: 80, outlineStyle: 'none' as any },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
