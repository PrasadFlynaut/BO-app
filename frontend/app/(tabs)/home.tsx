import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, FadeInDown, FadeInRight } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ProgressRing({ progress, size, strokeWidth, color, bgColor }: { progress: number; size: number; strokeWidth: number; color: string; bgColor: string }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={bgColor} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`} />
    </Svg>
  );
}

const QUOTES = [
  { text: "The food you eat can be either the safest and most powerful form of medicine or the slowest form of poison.", author: "Ann Wigmore" },
  { text: "Let food be thy medicine and medicine be thy food.", author: "Hippocrates" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const load = async () => {
    try { const { data } = await api.get('/dashboard'); setDashboard(data); } catch (e) { console.error(e); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const quickAdd = async (type: string, amount: number) => {
    try {
      if (type === 'water') await api.post('/water/log', { amount_ml: amount });
      else await api.post('/nutrition/log', { meal_type: type, food_name: `Quick ${type}`, calories: amount, protein_g: amount * 0.1, carbs_g: amount * 0.15, fat_g: amount * 0.05 });
      await load();
    } catch (e) { console.error(e); }
  };

  const greeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good Morning'; if (h < 17) return 'Good Afternoon'; return 'Good Evening'; };
  const waterPct = dashboard ? Math.min(dashboard.water_ml / dashboard.water_goal_ml, 1) : 0;
  const calPct = dashboard ? Math.min(dashboard.calories / dashboard.calorie_goal, 1) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <View>
            <Image source={{ uri: 'https://customer-assets.emergentagent.com/job_78422c49-5348-441f-bc53-d90eaaac0909/artifacts/9yt4dytf_BO_Logo_Color.png' }} style={styles.logo} resizeMode="contain" />
            <Text style={styles.tagline}>for your health on the go</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity testID="notifications-btn" style={styles.iconBtn}><Ionicons name="notifications" size={22} color={Colors.green} /></TouchableOpacity>
            <TouchableOpacity testID="favorites-btn" style={styles.iconBtn}><Ionicons name="heart" size={22} color={Colors.nutritionOrange} /></TouchableOpacity>
          </View>
        </Animated.View>

        {/* Greeting Hero */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <LinearGradient colors={['#26B50F', '#1E8F0C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroGreeting}>{greeting()}</Text>
                <Text style={styles.heroName}>{user?.name || 'User'}</Text>
              </View>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={16} color="#FF9F1C" />
                <Text style={styles.streakText}>7 day streak</Text>
              </View>
            </View>
            <Text style={styles.heroQuote}>"{quote.text}"</Text>
            <Text style={styles.heroAuthor}>— {quote.author}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Progress Rings Row */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.ringsRow}>
          <View style={[styles.ringCard, { backgroundColor: Colors.waterSurface }]}>
            <ProgressRing progress={waterPct} size={72} strokeWidth={7} color={Colors.waterBlue} bgColor="rgba(58,134,255,0.15)" />
            <View style={styles.ringCenter}>
              <Text style={[styles.ringValue, { color: Colors.waterBlue }]}>{dashboard?.water_ml || 0}</Text>
              <Text style={styles.ringUnit}>ml</Text>
            </View>
            <Text style={styles.ringLabel}>Water</Text>
            <Text style={styles.ringGoal}>{dashboard?.water_goal_ml || 2500}ml goal</Text>
          </View>
          <View style={[styles.ringCard, { backgroundColor: Colors.nutritionSurface }]}>
            <ProgressRing progress={calPct} size={72} strokeWidth={7} color={Colors.nutritionOrange} bgColor="rgba(255,159,28,0.15)" />
            <View style={styles.ringCenter}>
              <Text style={[styles.ringValue, { color: Colors.nutritionOrange }]}>{Math.round(dashboard?.calories || 0)}</Text>
              <Text style={styles.ringUnit}>cal</Text>
            </View>
            <Text style={styles.ringLabel}>Calories</Text>
            <Text style={styles.ringGoal}>{dashboard?.calorie_goal || 2000} goal</Text>
          </View>
          <View style={[styles.ringCard, { backgroundColor: Colors.greenLight }]}>
            <View style={styles.mealCountCircle}>
              <Text style={styles.mealCountNum}>{dashboard?.meals_logged || 0}</Text>
            </View>
            <Text style={styles.ringLabel}>Meals</Text>
            <Text style={styles.ringGoal}>logged today</Text>
          </View>
        </Animated.View>

        {/* Macros */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={[styles.macroCard, Shadow.md]}>
          <Text style={styles.sectionTitle}>Today's Macros</Text>
          <View style={styles.macroRow}>
            {[
              { label: 'Protein', value: dashboard?.protein_g || 0, color: '#FF5252', bg: '#FFF0F0' },
              { label: 'Carbs', value: dashboard?.carbs_g || 0, color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
              { label: 'Fat', value: dashboard?.fat_g || 0, color: Colors.green, bg: Colors.greenLight },
            ].map((m, i) => (
              <View key={m.label} style={[styles.macroItem, { backgroundColor: m.bg }]}>
                <Text style={[styles.macroValue, { color: m.color }]}>{Math.round(m.value)}g</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Quick Add */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <Text style={styles.sectionSub}>Track your nutrition in seconds</Text>
          <View style={styles.quickGrid}>
            {[
              { testId: 'quick-add-water', icon: 'water', label: 'Water', sub: '+250ml', color: Colors.waterBlue, bg: Colors.waterSurface, type: 'water', amount: 250 },
              { testId: 'quick-add-breakfast', icon: 'sunny', label: 'Breakfast', sub: '~350cal', color: Colors.nutritionOrange, bg: Colors.nutritionSurface, type: 'breakfast', amount: 350 },
              { testId: 'quick-add-lunch', icon: 'restaurant', label: 'Lunch', sub: '~500cal', color: Colors.green, bg: Colors.greenLight, type: 'lunch', amount: 500 },
              { testId: 'quick-add-dinner', icon: 'moon', label: 'Dinner', sub: '~600cal', color: Colors.fitnessPurple, bg: Colors.fitnessSurface, type: 'dinner', amount: 600 },
            ].map((q) => (
              <TouchableOpacity key={q.testId} testID={q.testId} style={[styles.quickBtn, { backgroundColor: q.bg }, Shadow.sm]} onPress={() => quickAdd(q.type, q.amount)} activeOpacity={0.7}>
                <View style={[styles.quickIconWrap, { backgroundColor: q.color + '20' }]}>
                  <Ionicons name={q.icon as any} size={22} color={q.color} />
                </View>
                <Text style={styles.quickLabel}>{q.label}</Text>
                <Text style={[styles.quickSub, { color: q.color }]}>{q.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Weight Progress */}
        {dashboard?.weight_kg && (
          <Animated.View entering={FadeInDown.delay(500).duration(600)} style={[styles.weightCard, Shadow.sm]}>
            <LinearGradient colors={[Colors.fitnessSurface, '#FFFFFF']} style={styles.weightGradient}>
              <View style={styles.weightHeader}>
                <Ionicons name="trending-down" size={20} color={Colors.fitnessPurple} />
                <Text style={styles.sectionTitle}>Weight Progress</Text>
              </View>
              <View style={styles.weightRow}>
                <View style={styles.weightItem}>
                  <Text style={styles.weightVal}>{dashboard.weight_kg}kg</Text>
                  <Text style={styles.weightLbl}>Current</Text>
                </View>
                <View style={styles.weightArrow}><Ionicons name="arrow-forward" size={20} color={Colors.fitnessPurple} /></View>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightVal, { color: Colors.green }]}>{dashboard.target_weight_kg || '?'}kg</Text>
                  <Text style={styles.weightLbl}>Target</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  logo: { width: 56, height: 56 },
  tagline: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '500', marginTop: -2 },
  headerIcons: { flexDirection: 'row', gap: Spacing.sm, marginTop: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },

  heroCard: { borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  heroGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.small },
  heroName: { color: '#FFF', fontSize: FontSize.h2, fontWeight: '800' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  streakText: { color: '#FFF', fontSize: FontSize.caption, fontWeight: '600' },
  heroQuote: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.small, fontStyle: 'italic', lineHeight: 22 },
  heroAuthor: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.caption, textAlign: 'right', marginTop: Spacing.sm },

  ringsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  ringCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', ...Shadow.sm },
  ringCenter: { position: 'absolute', top: Spacing.md, width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: FontSize.body, fontWeight: '800' },
  ringUnit: { fontSize: 10, color: Colors.textTertiary },
  ringLabel: { color: Colors.textPrimary, fontSize: FontSize.caption, fontWeight: '600', marginTop: Spacing.sm },
  ringGoal: { color: Colors.textTertiary, fontSize: 10 },
  mealCountCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(38,181,15,0.15)', alignItems: 'center', justifyContent: 'center' },
  mealCountNum: { fontSize: FontSize.h2, fontWeight: '800', color: Colors.green },

  macroCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.h4, fontWeight: '700', marginBottom: Spacing.sm },
  sectionSub: { color: Colors.textTertiary, fontSize: FontSize.small, marginBottom: Spacing.md, marginTop: -4 },
  macroRow: { flexDirection: 'row', gap: Spacing.sm },
  macroItem: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  macroValue: { fontSize: FontSize.h3, fontWeight: '800' },
  macroLabel: { color: Colors.textSecondary, fontSize: FontSize.caption, marginTop: 2 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickBtn: { width: (width - 48 - 8) / 2, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  quickIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  quickLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '600' },
  quickSub: { fontSize: FontSize.caption, fontWeight: '700', marginTop: 2 },

  weightCard: { borderRadius: Radius.lg, overflow: 'hidden', marginTop: Spacing.lg },
  weightGradient: { padding: Spacing.md },
  weightHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  weightItem: { alignItems: 'center' },
  weightVal: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '800' },
  weightLbl: { color: Colors.textTertiary, fontSize: FontSize.caption, marginTop: 2 },
  weightArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fitnessSurface, alignItems: 'center', justifyContent: 'center' },
});
