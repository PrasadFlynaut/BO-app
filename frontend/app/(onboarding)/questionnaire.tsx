import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

const FAST_FOODS = ['Pizza', 'Burgers', 'Tacos', 'Fried Chicken', 'Sushi', 'Salads', 'None'];
const ACTIVITY_LEVELS = [
  { id: 'Sedentary', icon: 'bed-outline', color: Colors.textTertiary },
  { id: 'Light', icon: 'walk-outline', color: Colors.waterBlue },
  { id: 'Moderate', icon: 'bicycle-outline', color: Colors.socialTeal },
  { id: 'Active', icon: 'fitness-outline', color: Colors.nutritionOrange },
  { id: 'Very Active', icon: 'flame-outline', color: '#FF5252' },
];

export default function QuestionnaireScreen() {
  const [fastFood, setFastFood] = useState('');
  const [dietaryRestriction, setDietaryRestriction] = useState(false);
  const [underNutritionist, setUnderNutritionist] = useState(false);
  const [healthInfo, setHealthInfo] = useState('');
  const [lifestyle, setLifestyle] = useState(3);
  const [sleepHours, setSleepHours] = useState('7');
  const [workout, setWorkout] = useState('');
  const [bestMeal, setBestMeal] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [gender, setGender] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const router = useRouter();

  const handleContinue = async () => {
    try {
      await api.put('/onboarding/questionnaire', {
        favorite_fast_food: fastFood, dietary_restriction: dietaryRestriction,
        under_nutritionist: underNutritionist, health_info: healthInfo,
        lifestyle_busyness: lifestyle, sleep_hours: parseFloat(sleepHours) || 7,
        current_workout_plan: workout, best_meal: bestMeal,
        height_cm: height ? parseFloat(height) : null, weight_kg: weight ? parseFloat(weight) : null,
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        gender: gender || null, activity_level: activityLevel || null,
      });
    } catch (e) { console.error(e); }
    router.push('/(onboarding)/life-goals');
  };

  const GENDERS = [
    { id: 'Male', icon: 'male-outline' as const, color: Colors.waterBlue, bg: Colors.waterSurface },
    { id: 'Female', icon: 'female-outline' as const, color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
    { id: 'Other', icon: 'person-outline' as const, color: Colors.socialTeal, bg: Colors.socialSurface },
  ];

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient colors={[Colors.waterBlue + '15', 'transparent']} style={st.stepBadge}>
              <Text style={st.step}>Step 5 of 8</Text>
            </LinearGradient>
            <Text style={st.title}>About You</Text>
            <Text style={st.subtitle}>Help us create your personalized plan</Text>
          </Animated.View>

          {/* Gender */}
          <Text style={st.label}>Gender</Text>
          <View style={st.row}>
            {GENDERS.map(g => (
              <TouchableOpacity key={g.id} style={[st.genderBtn, gender === g.id && { borderColor: g.color, backgroundColor: g.bg }]} onPress={() => setGender(g.id)} activeOpacity={0.7}>
                <Ionicons name={g.icon} size={20} color={gender === g.id ? g.color : Colors.textTertiary} />
                <Text style={[st.genderText, gender === g.id && { color: g.color }]}>{g.id}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Height/Weight */}
          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Height (cm)</Text>
              <TextInput style={st.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="170" placeholderTextColor={Colors.textTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Weight (kg)</Text>
              <TextInput style={st.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="70" placeholderTextColor={Colors.textTertiary} />
            </View>
          </View>

          <Text style={st.label}>Target Weight (kg)</Text>
          <TextInput style={st.input} value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" placeholder="65" placeholderTextColor={Colors.textTertiary} />

          {/* Fast Food */}
          <Text style={st.label}>Favorite Fast Food</Text>
          <View style={st.chipRow}>
            {FAST_FOODS.map(f => (
              <TouchableOpacity key={f} style={[st.chip, fastFood === f && st.chipActive]} onPress={() => setFastFood(f)} activeOpacity={0.7}>
                <Text style={[st.chipText, fastFood === f && st.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggle questions */}
          <TouchableOpacity style={st.toggleRow} onPress={() => setDietaryRestriction(!dietaryRestriction)} activeOpacity={0.7}>
            <Text style={st.toggleLabel}>Any dietary restrictions?</Text>
            <View style={[st.toggleBox, dietaryRestriction && st.toggleBoxActive]}>
              <Ionicons name={dietaryRestriction ? 'checkmark' : 'close'} size={16} color={dietaryRestriction ? '#FFF' : Colors.textTertiary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={st.toggleRow} onPress={() => setUnderNutritionist(!underNutritionist)} activeOpacity={0.7}>
            <Text style={st.toggleLabel}>Under nutritionist supervision?</Text>
            <View style={[st.toggleBox, underNutritionist && st.toggleBoxActive]}>
              <Ionicons name={underNutritionist ? 'checkmark' : 'close'} size={16} color={underNutritionist ? '#FFF' : Colors.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* Activity Level */}
          <Text style={st.label}>Activity Level</Text>
          <View style={st.chipRow}>
            {ACTIVITY_LEVELS.map(lvl => (
              <TouchableOpacity key={lvl.id} style={[st.chip, activityLevel === lvl.id && { borderColor: lvl.color, backgroundColor: lvl.color + '15' }]} onPress={() => setActivityLevel(lvl.id)} activeOpacity={0.7}>
                <Ionicons name={lvl.icon as any} size={14} color={activityLevel === lvl.id ? lvl.color : Colors.textTertiary} />
                <Text style={[st.chipText, activityLevel === lvl.id && { color: lvl.color }]}>{lvl.id}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sleep */}
          <Text style={st.label}>Hours of Sleep per Day</Text>
          <TextInput style={st.input} value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" placeholder="7" placeholderTextColor={Colors.textTertiary} />

          {/* Workout plan */}
          <Text style={st.label}>Current Workout Plan</Text>
          <TextInput style={st.input} value={workout} onChangeText={setWorkout} placeholder="e.g. 3x/week strength training" placeholderTextColor={Colors.textTertiary} />

          {/* Best Meal */}
          <Text style={st.label}>Meal That Makes You Feel Best</Text>
          <TextInput style={st.input} value={bestMeal} onChangeText={setBestMeal} placeholder="e.g. Grilled chicken salad" placeholderTextColor={Colors.textTertiary} />

          {/* Health info (optional, HIPAA) */}
          <Text style={st.label}>Health Information (Optional, Confidential)</Text>
          <TextInput style={[st.input, { minHeight: 60 }]} value={healthInfo} onChangeText={setHealthInfo} placeholder="Any special health considerations..." placeholderTextColor={Colors.textTertiary} multiline textAlignVertical="top" />

          <TouchableOpacity testID="questionnaire-continue" onPress={handleContinue} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.waterBlue, '#2A6FCC']} style={[st.button, Shadow.md]}>
              <Text style={st.buttonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  stepBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.pill, marginBottom: Spacing.md },
  step: { color: Colors.waterBlue, fontSize: FontSize.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.lg, lineHeight: 24 },
  label: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.lg, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body, outlineStyle: 'none' as any },
  row: { flexDirection: 'row', gap: Spacing.sm },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgBase },
  genderText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.small },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgBase },
  chipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.small, fontWeight: '500' },
  chipTextActive: { color: Colors.green, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  toggleLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '600' },
  toggleBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  toggleBoxActive: { backgroundColor: Colors.green },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl, marginBottom: Spacing.lg },
  buttonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
