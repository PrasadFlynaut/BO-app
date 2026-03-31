import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, ScrollView, Animated,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PLAN_STYLES: Record<string, { gradient: [string, string]; surface: string; icon: string }> = {
  keto:            { gradient: ['#FF6B35', '#FF9F1C'], surface: '#FFF7ED', icon: 'flame' },
  mediterranean:   { gradient: ['#06D6A0', '#26B50F'], surface: '#E6FFF7', icon: 'heart' },
  vegan:           { gradient: ['#26B50F', '#DBFF02'], surface: '#F0FDF4', icon: 'leaf' },
  'clean-eating':  { gradient: ['#3A86FF', '#06D6A0'], surface: '#F0F8FF', icon: 'sparkles' },
  'high-protein':  { gradient: ['#8338EC', '#FF5252'], surface: '#FDF4FF', icon: 'barbell' },
  balanced:        { gradient: ['#DBFF02', '#26B50F'], surface: '#F0FDF4', icon: 'scale' },
};

const TIPS = [
  { icon: 'water-outline', title: 'Stay Hydrated', desc: 'Drink 8 glasses of water daily', color: Colors.waterBlue, bg: Colors.waterSurface },
  { icon: 'moon-outline', title: 'Sleep Well', desc: 'Quality sleep supports healthy eating', color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
  { icon: 'timer-outline', title: 'Meal Timing', desc: 'Eat at consistent times each day', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
  { icon: 'leaf-outline', title: 'Eat Whole Foods', desc: 'Prioritize nutrient-dense foods', color: Colors.green, bg: Colors.greenLight },
];

export default function MenuScreen() {
  const [plans, setPlans] = useState<any[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [mealsMap, setMealsMap] = useState<Record<string, any[]>>({});
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadPlans(); }, []));

  const loadPlans = async () => {
    try {
      const { data } = await api.get('/diet-plans');
      setPlans(data.plans);
    } catch (e) { console.error(e); }
  };

  const togglePlan = async (id: string) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    if (expandedPlan === id) {
      setExpandedPlan(null);
      return;
    }

    setExpandedPlan(id);

    if (!mealsMap[id]) {
      setLoadingPlan(id);
      try {
        const { data } = await api.get(`/diet-plans/${id}`);
        setMealsMap(prev => ({ ...prev, [id]: data.meals }));
      } catch (e) { console.error(e); }
      setLoadingPlan(null);
    }
  };

  const addMeal = async (meal: any) => {
    try {
      await api.post('/nutrition/log', {
        meal_type: meal.category,
        food_name: meal.name,
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
      });
    } catch (e) { console.error(e); }
  };

  const isExpanded = (id: string) => expandedPlan === id;
  const planMeals = (id: string) => mealsMap[id] || [];

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.hero}>
        <Text style={st.heroTitle}>Smart Menu</Text>
        <Text style={st.heroSub}>Curated plans for every lifestyle</Text>
      </LinearGradient>

      {/* Section Title */}
      <View style={st.sectionHeader}>
        <Text style={st.sectionTitle}>Diet Plans</Text>
        <Text style={st.sectionSubtitle}>Tap to explore meals</Text>
      </View>

      {/* Accordion Plans */}
      {plans.map((plan) => {
        const ps = PLAN_STYLES[plan.id] || PLAN_STYLES.balanced;
        const expanded = isExpanded(plan.id);
        const meals = planMeals(plan.id);
        const isLoading = loadingPlan === plan.id;

        return (
          <View key={plan.id} style={st.accordionWrapper}>
            {/* Plan Header - Tappable */}
            <TouchableOpacity
              testID={`plan-${plan.id}`}
              onPress={() => togglePlan(plan.id)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={expanded ? ps.gradient : [Colors.bgBase, Colors.bgBase]}
                style={[st.accordionHead, !expanded && st.accordionBorder, expanded && Shadow.md]}
              >
                <View style={[st.planIconCircle, { backgroundColor: expanded ? 'rgba(255,255,255,0.25)' : ps.surface }]}>
                  <Ionicons name={ps.icon as any} size={20} color={expanded ? '#FFF' : ps.gradient[0]} />
                </View>
                <View style={st.planInfo}>
                  <Text style={[st.planName, expanded && st.planNameActive]}>{plan.name}</Text>
                  <Text style={[st.planMeta, expanded && st.planMetaActive]}>
                    {plan.duration_days} days · {plan.difficulty} · {plan.calories_range} cal
                  </Text>
                </View>
                <View style={[st.chevronCircle, { backgroundColor: expanded ? 'rgba(255,255,255,0.25)' : ps.surface }]}>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={expanded ? '#FFF' : ps.gradient[0]}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Expanded Content */}
            {expanded && (
              <View style={[st.accordionBody, { borderColor: ps.gradient[0] + '20' }]}>
                {/* Plan Description */}
                <View style={[st.descRow, { backgroundColor: ps.surface }]}>
                  <Ionicons name="information-circle" size={16} color={ps.gradient[0]} />
                  <Text style={st.descText}>{plan.description}</Text>
                </View>

                {/* Loading State */}
                {isLoading && (
                  <View style={st.loadWrap}>
                    <ActivityIndicator size="small" color={ps.gradient[0]} />
                    <Text style={st.loadText}>Loading meals...</Text>
                  </View>
                )}

                {/* Meals */}
                {!isLoading && meals.length > 0 && (
                  <View style={st.mealsContainer}>
                    {meals.map((m: any) => (
                      <View key={m.id} style={[st.mealCard, Shadow.sm]}>
                        <Image source={{ uri: m.image_url }} style={st.mealImg} />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={st.mealOverlay}
                        >
                          <View style={st.catBadge}>
                            <Text style={[st.catText, { color: ps.gradient[0] }]}>{m.category}</Text>
                          </View>
                          <Text style={st.mealTitle}>{m.name}</Text>
                        </LinearGradient>
                        <View style={st.mealBody}>
                          <View style={st.macros}>
                            {[
                              { l: `${m.calories} cal`, c: Colors.nutritionOrange, b: Colors.nutritionSurface },
                              { l: `P ${m.protein_g}g`, c: '#FF5252', b: '#FFF0F0' },
                              { l: `C ${m.carbs_g}g`, c: Colors.waterBlue, b: Colors.waterSurface },
                              { l: `F ${m.fat_g}g`, c: Colors.green, b: Colors.greenLight },
                            ].map((n, i) => (
                              <View key={i} style={[st.pill, { backgroundColor: n.b }]}>
                                <Text style={[st.pillT, { color: n.c }]}>{n.l}</Text>
                              </View>
                            ))}
                          </View>
                          <View style={st.mealFoot}>
                            <View style={st.prepRow}>
                              <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
                              <Text style={st.prepText}>{m.prep_time} min</Text>
                            </View>
                            <TouchableOpacity testID={`add-meal-${m.id}`} onPress={() => addMeal(m)} activeOpacity={0.7}>
                              <LinearGradient colors={ps.gradient} style={st.logBtn}>
                                <Ionicons name="add" size={14} color="#FFF" />
                                <Text style={st.logText}>Log Meal</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {!isLoading && meals.length === 0 && !loadingPlan && (
                  <View style={st.noMeals}>
                    <Ionicons name="restaurant-outline" size={24} color={Colors.textTertiary} />
                    <Text style={st.noMealsText}>No meals available</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Nutrition Tips */}
      <View style={st.tipsSection}>
        <Text style={st.sectionTitle}>Nutrition Tips</Text>
        {TIPS.map((t, i) => (
          <View key={i} style={[st.tipCard, { backgroundColor: t.bg }]}>
            <View style={[st.tipIcon, { backgroundColor: t.color + '20' }]}>
              <Ionicons name={t.icon as any} size={20} color={t.color} />
            </View>
            <View style={st.tipContent}>
              <Text style={st.tipTitle}>{t.title}</Text>
              <Text style={st.tipDesc}>{t.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  content:   { paddingBottom: 120 },

  // Hero
  hero:      { paddingTop: 56, paddingBottom: 24, paddingHorizontal: Spacing.md, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  heroTitle: { fontSize: FontSize.h1, fontWeight: '800', color: '#FFF' },
  heroSub:   { fontSize: FontSize.small, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  // Section
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionTitle:   { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  sectionSubtitle:{ fontSize: FontSize.small, color: Colors.textTertiary },

  // Accordion
  accordionWrapper: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  accordionHead:    { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, padding: 14, gap: 12 },
  accordionBorder:  { borderWidth: 1.5, borderColor: Colors.borderLight },
  accordionBody:    { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg, paddingBottom: Spacing.sm, backgroundColor: Colors.bgBase },

  // Plan card elements
  planIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  planInfo:       { flex: 1 },
  planName:       { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  planNameActive: { color: '#FFF' },
  planMeta:       { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  planMetaActive: { color: 'rgba(255,255,255,0.8)' },
  chevronCircle:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Description row
  descRow:  { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, marginHorizontal: 12, marginTop: 12, borderRadius: Radius.md },
  descText: { flex: 1, fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20 },

  // Loading
  loadWrap:  { alignItems: 'center', paddingVertical: Spacing.lg, gap: 8 },
  loadText:  { fontSize: FontSize.small, color: Colors.textTertiary },

  // Meals inside accordion
  mealsContainer: { paddingHorizontal: 12, paddingTop: 12 },
  mealCard:       { backgroundColor: '#FFF', borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight },
  mealImg:        { width: '100%', height: 150 },
  mealOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, height: 150, justifyContent: 'flex-end', padding: 12 },
  catBadge:       { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  catText:        { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  mealTitle:      { fontSize: FontSize.h4, fontWeight: '800', color: '#FFF' },
  mealBody:       { padding: 12 },
  macros:         { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill:           { borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  pillT:          { fontSize: 11, fontWeight: '700' },
  mealFoot:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  prepRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prepText:       { fontSize: FontSize.caption, color: Colors.textTertiary },
  logBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  logText:        { fontSize: FontSize.caption, fontWeight: '700', color: '#FFF' },

  // No meals
  noMeals:     { alignItems: 'center', paddingVertical: Spacing.lg, gap: 8 },
  noMealsText: { fontSize: FontSize.small, color: Colors.textTertiary },

  // Tips
  tipsSection: { padding: Spacing.md, marginTop: Spacing.sm },
  tipCard:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  tipIcon:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tipContent:  { flex: 1 },
  tipTitle:    { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  tipDesc:     { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
});
