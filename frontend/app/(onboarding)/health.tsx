import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

  const GENDERS = [
    { id: 'Male', icon: 'male-outline' as const, color: Colors.waterBlue, bg: Colors.waterSurface },
    { id: 'Female', icon: 'female-outline' as const, color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
    { id: 'Other', icon: 'person-outline' as const, color: Colors.socialTeal, bg: Colors.socialSurface },
  ];

  const ACTIVITY_LEVELS = [
    { id: 'Sedentary', icon: 'bed-outline', color: Colors.textTertiary },
    { id: 'Light', icon: 'walk-outline', color: Colors.waterBlue },
    { id: 'Moderate', icon: 'bicycle-outline', color: Colors.socialTeal },
    { id: 'Active', icon: 'fitness-outline', color: Colors.nutritionOrange },
    { id: 'Very Active', icon: 'flame-outline', color: '#FF5252' },
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      const goals = JSON.parse((params.goals as string) || '[]');
      const diets = JSON.parse((params.diets as string) || '[]');
      const allergies = JSON.parse((params.allergies as string) || '[]');
      await api.put('/profile/onboarding', {
        goals,
        dietary_preferences: diets,
        allergies,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        gender: gender || null,
        activity_level: activityLevel || null,
      });
      await refreshUser();
      router.replace('/(tabs)/home');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient colors={[Colors.fitnessPurple + '15', 'transparent']} style={styles.stepBadge}>
              <Text style={styles.step}>Step 3 of 3</Text>
            </LinearGradient>
            <Text style={styles.title}>Health Details</Text>
            <Text style={styles.subtitle}>Help us personalize your experience</Text>
          </Animated.View>

          {/* Gender */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={styles.labelRow}>
              <Ionicons name="body-outline" size={16} color={Colors.fitnessPurple} />
              <Text style={styles.label}>Gender</Text>
            </View>
            <View style={styles.genderRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g.id}
                  testID={`gender-${g.id}`}
                  style={[styles.genderBtn, gender === g.id && { borderColor: g.color, backgroundColor: g.bg }]}
                  onPress={() => setGender(g.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.genderIconCircle, { backgroundColor: gender === g.id ? g.color + '20' : Colors.greenLight }]}>
                    <Ionicons name={g.icon} size={20} color={gender === g.id ? g.color : Colors.textTertiary} />
                  </View>
                  <Text style={[styles.genderText, gender === g.id && { color: g.color, fontWeight: '700' }]}>{g.id}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Height & Weight */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="resize-outline" size={16} color={Colors.waterBlue} />
                  <Text style={styles.label}>Height (cm)</Text>
                </View>
                <View style={[styles.inputWrap, { borderColor: Colors.waterBlue + '30' }]}>
                  <TextInput
                    testID="height-input"
                    style={styles.input}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    placeholder="170"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <Text style={[styles.inputUnit, { color: Colors.waterBlue }]}>cm</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="scale-outline" size={16} color={Colors.nutritionOrange} />
                  <Text style={styles.label}>Weight (kg)</Text>
                </View>
                <View style={[styles.inputWrap, { borderColor: Colors.nutritionOrange + '30' }]}>
                  <TextInput
                    testID="weight-input"
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="70"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <Text style={[styles.inputUnit, { color: Colors.nutritionOrange }]}>kg</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Target Weight */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View style={styles.labelRow}>
              <Ionicons name="flag-outline" size={16} color={Colors.green} />
              <Text style={styles.label}>Target Weight (kg)</Text>
            </View>
            <View style={[styles.inputWrap, { borderColor: Colors.green + '30' }]}>
              <TextInput
                testID="target-weight-input"
                style={styles.input}
                value={targetWeight}
                onChangeText={setTargetWeight}
                keyboardType="numeric"
                placeholder="65"
                placeholderTextColor={Colors.textTertiary}
              />
              <Text style={[styles.inputUnit, { color: Colors.green }]}>kg</Text>
            </View>
          </Animated.View>

          {/* Activity Level */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <View style={styles.labelRow}>
              <Ionicons name="flash-outline" size={16} color={Colors.nutritionOrange} />
              <Text style={styles.label}>Activity Level</Text>
            </View>
            <View style={styles.activityGrid}>
              {ACTIVITY_LEVELS.map((lvl, i) => (
                <Animated.View key={lvl.id} entering={FadeInDown.delay(450 + i * 60).duration(300)}>
                  <TouchableOpacity
                    testID={`activity-${lvl.id}`}
                    style={[
                      styles.activityChip,
                      activityLevel === lvl.id && { borderColor: lvl.color, backgroundColor: lvl.color + '10' },
                    ]}
                    onPress={() => setActivityLevel(lvl.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={lvl.icon as any} size={18} color={activityLevel === lvl.id ? lvl.color : Colors.textTertiary} />
                    <Text style={[styles.activityText, activityLevel === lvl.id && { color: lvl.color, fontWeight: '700' }]}>{lvl.id}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInDown.delay(700).duration(500)} style={btnAnimStyle}>
            <TouchableOpacity
              testID="complete-onboarding-button"
              onPress={() => {
                btnScale.value = withSpring(0.95, { stiffness: 400 });
                setTimeout(() => {
                  btnScale.value = withSpring(1, { stiffness: 300 });
                  handleComplete();
                }, 150);
              }}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[Colors.lime, Colors.green]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.button, Shadow.lg]}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={22} color={Colors.textPrimary} />
                    <Text style={styles.buttonText}>Start My Journey</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  stepBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.pill, marginBottom: Spacing.md },
  step: { color: Colors.fitnessPurple, fontSize: FontSize.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h1, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  label: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.greenLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, paddingVertical: 14, color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '600' },
  inputUnit: { fontSize: FontSize.small, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: Spacing.md },
  inputGroup: { flex: 1 },
  genderRow: { flexDirection: 'row', gap: Spacing.sm },
  genderBtn: {
    flex: 1,
    backgroundColor: Colors.bgBase,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  genderIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  genderText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.small },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  activityChip: {
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
  activityText: { color: Colors.textSecondary, fontWeight: '500', fontSize: FontSize.small },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  buttonText: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '800' },
});
