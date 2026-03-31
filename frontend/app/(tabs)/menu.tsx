import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Dimensions, FlatList,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

const { width } = Dimensions.get('window');

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
  const [selectedPlan, setSelected] = useState<string | null>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => { loadPlans(); }, []));

  const loadPlans = async () => {
    try { const { data } = await api.get('/diet-plans'); setPlans(data.plans); }
    catch (e) { console.error(e); }
  };

  const selectPlan = async (id: string) => {
    setSelected(id);
    setLoading(true);
    try { const { data } = await api.get(`/diet-plans/${id}`); setMeals(data.meals); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  const addMeal = async (meal: any) => {
    try { await api.post('/nutrition/log', { meal_type: meal.category, food_name: meal.name, calories: meal.calories, protein_g: meal.protein_g, carbs_g: meal.carbs_g, fat_g: meal.fat_g }); }
    catch (e) { console.error(e); }
  };

  const planData = plans.find(p => p.id === selectedPlan);
  const planColor = selectedPlan ? (PLAN_STYLES[selectedPlan] || PLAN_STYLES.balanced) : null;

  // Use FlatList for the entire screen — meals as data, everything else as header
  const renderHeader = () => (
    <View>
      {/* Hero */}
      <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.hero}>
        <Text style={st.heroTitle}>Smart Menu</Text>
        <Text style={st.heroSub}>Curated plans for every lifestyle</Text>
      </LinearGradient>

      {/* Plan Grid - 2 columns */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Choose Your Plan</Text>
        <View style={st.planGrid}>
          {plans.map((p) => {
            const ps = PLAN_STYLES[p.id] || PLAN_STYLES.balanced;
            const active = selectedPlan === p.id;
            return (
              <TouchableOpacity key={p.id} testID={`plan-${p.id}`} onPress={() => selectPlan(p.id)} activeOpacity={0.8} style={st.planSlot}>
                <LinearGradient
                  colors={active ? ps.gradient : [Colors.bgBase, Colors.bgBase]}
                  style={[st.planCard, !active && st.planBorder, active && Shadow.md]}
                >
                  <View style={[st.planIcon, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : ps.surface }]}>
                    <Ionicons name={ps.icon as any} size={18} color={active ? '#FFF' : ps.gradient[0]} />
                  </View>
                  <View style={st.planText}>
                    <Text style={[st.planName, active && { color: '#FFF' }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[st.planMeta, active && { color: 'rgba(255,255,255,0.8)' }]}>{p.duration_days}d · {p.difficulty}</Text>
                  </View>
                  {active && <View style={st.planCheck}><Ionicons name="checkmark" size={12} color={ps.gradient[0]} /></View>}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Banner */}
      {planData && planColor && (
        <View style={[st.banner, { backgroundColor: planColor.surface }]}>
          <Ionicons name="information-circle" size={18} color={planColor.gradient[0]} />
          <View style={{ flex: 1 }}>
            <Text style={st.bannerDesc}>{planData.description}</Text>
            <Text style={[st.bannerCal, { color: planColor.gradient[0] }]}>{planData.calories_range} cal/day</Text>
          </View>
        </View>
      )}

      {selectedPlan && !loading && meals.length > 0 && (
        <Text style={[st.sectionTitle, { paddingHorizontal: Spacing.md }]}>Meals</Text>
      )}

      {selectedPlan && loading && (
        <View style={st.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (selectedPlan) return null;
    return (
      <View style={st.section}>
        <View style={st.emptyBox}>
          <View style={st.emptyIcon}><Ionicons name="restaurant-outline" size={36} color={Colors.green} /></View>
          <Text style={st.emptyTitle}>Explore Diet Plans</Text>
          <Text style={st.emptySub}>Tap a plan above to browse meals</Text>
        </View>
        <Text style={st.sectionTitle}>Nutrition Tips</Text>
        {TIPS.map((t, i) => (
          <View key={i} style={[st.tipCard, { backgroundColor: t.bg }]}>
            <View style={[st.tipIcon, { backgroundColor: t.color + '20' }]}>
              <Ionicons name={t.icon as any} size={20} color={t.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.tipTitle}>{t.title}</Text>
              <Text style={st.tipDesc}>{t.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderMeal = ({ item: m }: { item: any }) => (
    <View style={[st.mealCard, Shadow.sm]}>
      <Image source={{ uri: m.image_url }} style={st.mealImg} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={st.mealOverlay}>
        <View style={st.catBadge}><Text style={st.catText}>{m.category}</Text></View>
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
            <View key={i} style={[st.pill, { backgroundColor: n.b }]}><Text style={[st.pillT, { color: n.c }]}>{n.l}</Text></View>
          ))}
        </View>
        <View style={st.mealFoot}>
          <View style={st.prepRow}><Ionicons name="time-outline" size={14} color={Colors.textTertiary} /><Text style={st.prepText}>{m.prep_time} min</Text></View>
          <TouchableOpacity testID={`add-meal-${m.id}`} onPress={() => addMeal(m)} activeOpacity={0.7}>
            <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.logBtn}>
              <Ionicons name="add" size={16} color="#FFF" /><Text style={st.logText}>Log</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      style={st.list}
      data={selectedPlan && !loading ? meals : []}
      keyExtractor={(m) => m.id}
      renderItem={renderMeal}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={st.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const st = StyleSheet.create({
  list:        { flex: 1, backgroundColor: Colors.bgBase },
  listContent: { paddingBottom: 120 },

  hero:     { paddingTop: 56, paddingBottom: 20, paddingHorizontal: Spacing.md, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  heroTitle:{ fontSize: FontSize.h1, fontWeight: '800', color: '#FFF' },
  heroSub:  { fontSize: FontSize.small, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  section:      { padding: Spacing.md },
  sectionTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },

  planGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  planSlot:   { width: '48%' as any },
  planCard:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.lg, padding: 10 },
  planBorder: { borderWidth: 1.5, borderColor: Colors.borderLight },
  planIcon:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  planText:   { flex: 1 },
  planName:   { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  planMeta:   { fontSize: 9, color: Colors.textTertiary, marginTop: 1 },
  planCheck:  { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },

  banner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  bannerDesc: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20 },
  bannerCal:  { fontWeight: '700', fontSize: FontSize.small, marginTop: 4 },

  loadWrap: { alignItems: 'center', paddingVertical: 40 },

  mealCard:   { backgroundColor: '#FFF', borderRadius: Radius.lg, overflow: 'hidden', marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  mealImg:    { width: '100%', height: 170 },
  mealOverlay:{ position: 'absolute', top: 0, left: 0, right: 0, height: 170, justifyContent: 'flex-end', padding: Spacing.md },
  catBadge:   { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  catText:    { fontSize: 10, fontWeight: '700', color: Colors.green, textTransform: 'uppercase' },
  mealTitle:  { fontSize: FontSize.h3, fontWeight: '800', color: '#FFF' },
  mealBody:   { padding: Spacing.md },
  macros:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill:       { borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  pillT:      { fontSize: 11, fontWeight: '700' },
  mealFoot:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  prepRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prepText:   { fontSize: FontSize.caption, color: Colors.textTertiary },
  logBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: Spacing.md },
  logText:    { fontSize: FontSize.caption, fontWeight: '700', color: '#FFF' },

  emptyBox:   { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.h3, fontWeight: '700', color: Colors.textPrimary },
  emptySub:   { fontSize: FontSize.small, color: Colors.textTertiary, marginTop: 4 },

  tipCard:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  tipIcon:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  tipDesc:  { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
});
