import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import api from '@/src/api';
import { useAuth } from '@/src/auth';

export default function HealthScreen() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [gender, setGender] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUser } = useAuth();
  const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'];

  const handleComplete = async () => {
    setLoading(true);
    try {
      const goals = JSON.parse((params.goals as string) || '[]');
      const diets = JSON.parse((params.diets as string) || '[]');
      const allergies = JSON.parse((params.allergies as string) || '[]');
      await api.put('/profile/onboarding', { goals, dietary_preferences: diets, allergies, height_cm: height ? parseFloat(height) : null, weight_kg: weight ? parseFloat(weight) : null, target_weight_kg: targetWeight ? parseFloat(targetWeight) : null, gender: gender || null, activity_level: activityLevel || null });
      await refreshUser();
      router.replace('/(tabs)/home');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>Health Details</Text>
          <Text style={styles.subtitle}>Help us personalize your experience</Text>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.row}>
            {['Male', 'Female', 'Other'].map(g => (
              <TouchableOpacity key={g} testID={`gender-${g}`} style={[styles.genderBtn, gender === g && styles.genderBtnActive]} onPress={() => setGender(g)}>
                <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}><Text style={styles.label}>Height (cm)</Text><TextInput testID="height-input" style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="170" placeholderTextColor={Colors.textMuted} /></View>
            <View style={{ flex: 1 }}><Text style={styles.label}>Weight (kg)</Text><TextInput testID="weight-input" style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="70" placeholderTextColor={Colors.textMuted} /></View>
          </View>
          <Text style={styles.label}>Target Weight (kg)</Text>
          <TextInput testID="target-weight-input" style={styles.input} value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" placeholder="65" placeholderTextColor={Colors.textMuted} />
          <Text style={styles.label}>Activity Level</Text>
          <View style={styles.activityGrid}>
            {ACTIVITY_LEVELS.map(lvl => (
              <TouchableOpacity key={lvl} testID={`activity-${lvl}`} style={[styles.activityChip, activityLevel === lvl && styles.activityChipActive]} onPress={() => setActivityLevel(lvl)}>
                <Text style={[styles.activityText, activityLevel === lvl && styles.activityTextActive]}>{lvl}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity testID="complete-onboarding-button" style={styles.button} onPress={handleComplete} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#FFF" /> : (<><Text style={styles.buttonText}>Start My Journey</Text><Ionicons name="rocket-outline" size={20} color="#FFF" /></>)}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xxl },
  step: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '700', marginTop: Spacing.sm },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.xl },
  label: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body },
  row: { flexDirection: 'row', gap: Spacing.sm },
  inputRow: { flexDirection: 'row', gap: Spacing.md },
  genderBtn: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  genderBtnActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  genderText: { color: Colors.textSecondary, fontWeight: '600' },
  genderTextActive: { color: Colors.green },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  activityChip: { backgroundColor: Colors.bgSurface, borderRadius: Radius.full, paddingVertical: 10, paddingHorizontal: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  activityChipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  activityText: { color: Colors.textSecondary, fontWeight: '500' },
  activityTextActive: { color: Colors.green },
  button: { backgroundColor: Colors.green, borderRadius: Radius.md, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl, marginBottom: Spacing.xxl },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
