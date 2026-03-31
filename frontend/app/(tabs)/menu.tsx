import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

const PLAN_COLORS: Record<string, { gradient: [string, string]; surface: string; icon: string }> = {
  keto: { gradient: ['#FF6B35', '#FF9F1C'], surface: '#FFF7ED', icon: 'flame' },
  mediterranean: { gradient: ['#06D6A0', '#26B50F'], surface: '#E6FFF7', icon: 'heart' },
  vegan: { gradient: ['#26B50F', '#DBFF02'], surface: '#F0FDF4', icon: 'leaf' },
  'clean-eating': { gradient: ['#3A86FF', '#06D6A0'], surface: '#F0F8FF', icon: 'sparkles' },
  'high-protein': { gradient: ['#8338EC', '#FF5252'], surface: '#FDF4FF', icon: 'barbell' },
  balanced: { gradient: ['#DBFF02', '#26B50F'], surface: '#F0FDF4', icon: 'scale' },
};

export default function MenuScreen() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => { loadPlans(); }, []));
  const loadPlans = async () => { try { const { data } = await api.get('/diet-plans'); setPlans(data.plans); } catch (e) { console.error(e); } };
  const selectPlan = async (planId: string) => { setSelectedPlan(planId); setLoading(true); try { const { data } = await api.get(`/diet-plans/${planId}`); setMeals(data.meals); } catch (e) { console.error(e); } setLoading(false); };
  const addMeal = async (meal: any) => { try { await api.post('/nutrition/log', { meal_type: meal.category, food_name: meal.name, calories: meal.calories, protein_g: meal.protein_g, carbs_g: meal.carbs_g, fat_g: meal.fat_g }); } catch (e) { console.error(e); } };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const planStyle = selectedPlan ? PLAN_COLORS[selectedPlan] || PLAN_COLORS.balanced : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.title}>Smart Menu</Text>
          <Text style={styles.subtitle}>Curated plans for every lifestyle</Text>
        </Animated.View>

        {/* Plan Cards */}
        <View style={{ height: 150 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planList}>
            {plans.map((item, index) => {
              const ps = PLAN_COLORS[item.id] || PLAN_COLORS.balanced;
              const active = selectedPlan === item.id;
              return (
                <Animated.View key={item.id} entering={FadeInRight.delay(index * 80).duration(400)}>
                  <TouchableOpacity testID={`plan-${item.id}`} onPress={() => selectPlan(item.id)} activeOpacity={0.8}>
                    <LinearGradient colors={active ? ps.gradient : ['#FFFFFF', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.planCard, active ? Shadow.md : { borderWidth: 1, borderColor: Colors.borderLight }]}>
                      <View style={[styles.planIconWrap, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : ps.surface }]}>
                        <Ionicons name={ps.icon as any} size={20} color={active ? '#FFF' : ps.gradient[0]} />
                      </View>
                      <Text style={[styles.planCardName, active && { color: '#FFF' }]}>{item.name}</Text>
                      <Text style={[styles.planCardMeta, active && { color: 'rgba(255,255,255,0.8)' }]}>{item.duration_days}d | {item.difficulty}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* Plan Banner */}
        {selectedPlanData && planStyle && (
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.planBanner, { backgroundColor: planStyle.surface }]}>
            <Text style={styles.planBannerDesc}>{selectedPlanData.description}</Text>
            <Text style={[styles.planBannerCal, { color: planStyle.gradient[0] }]}>{selectedPlanData.calories_range} cal/day</Text>
          </Animated.View>
        )}

        {/* Empty State */}
        {!selectedPlan && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="restaurant-outline" size={48} color={Colors.green} />
            </View>
            <Text style={styles.emptyTitle}>Explore Diet Plans</Text>
            <Text style={styles.emptyText}>Tap a plan above to browse meals</Text>
          </View>
        )}

        {/* Loading */}
        {selectedPlan && loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.green} />
            <Text style={styles.loadingText}>Loading meals...</Text>
          </View>
        )}

        {/* Meals */}
        {selectedPlan && !loading && meals.map((item, index) => (
          <Animated.View key={item.id} entering={FadeInDown.delay(index * 60).duration(400)}>
            <View style={[styles.mealCard, Shadow.sm]}>
              <Image source={{ uri: item.image_url }} style={styles.mealImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.mealImageOverlay}>
                <View style={styles.mealCategoryBadge}><Text style={styles.mealCategoryText}>{item.category}</Text></View>
                <Text style={styles.mealNameOverlay}>{item.name}</Text>
              </LinearGradient>
              <View style={styles.mealBody}>
                <View style={styles.mealNutrients}>
                  <View style={[styles.nutrientPill, { backgroundColor: Colors.nutritionSurface }]}><Text style={[styles.nutrientText, { color: Colors.nutritionOrange }]}>{item.calories} cal</Text></View>
                  <View style={[styles.nutrientPill, { backgroundColor: '#FFF0F0' }]}><Text style={[styles.nutrientText, { color: '#FF5252' }]}>P {item.protein_g}g</Text></View>
                  <View style={[styles.nutrientPill, { backgroundColor: Colors.waterSurface }]}><Text style={[styles.nutrientText, { color: Colors.waterBlue }]}>C {item.carbs_g}g</Text></View>
                  <View style={[styles.nutrientPill, { backgroundColor: Colors.greenLight }]}><Text style={[styles.nutrientText, { color: Colors.green }]}>F {item.fat_g}g</Text></View>
                </View>
                <View style={styles.mealFooter}>
                  <View style={styles.prepTime}><Ionicons name="time-outline" size={14} color={Colors.textTertiary} /><Text style={styles.prepTimeText}>{item.prep_time} min</Text></View>
                  <TouchableOpacity testID={`add-meal-${item.id}`} onPress={() => addMeal(item)} activeOpacity={0.7}>
                    <LinearGradient colors={[Colors.green, Colors.greenDark]} style={styles.addBtn}><Ionicons name="add" size={18} color="#FFF" /><Text style={styles.addBtnText}>Log</Text></LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scrollContent: { paddingBottom: 100, flexGrow: 0 },
  title: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '800', paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.small, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  planList: { paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  planCard: { width: 110, height: 130, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  planIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  planCardName: { color: Colors.textPrimary, fontSize: FontSize.small, fontWeight: '700', textAlign: 'center' },
  planCardMeta: { color: Colors.textTertiary, fontSize: 10, marginTop: 2, textAlign: 'center' },
  planBanner: { marginHorizontal: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  planBannerDesc: { color: Colors.textSecondary, fontSize: FontSize.small, lineHeight: 20 },
  planBannerCal: { fontWeight: '700', fontSize: FontSize.small, marginTop: 4 },
  mealCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, overflow: 'hidden', marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  mealImage: { width: '100%', height: 180 },
  mealImageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, justifyContent: 'flex-end', padding: Spacing.md },
  mealCategoryBadge: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  mealCategoryText: { color: Colors.green, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  mealNameOverlay: { color: '#FFF', fontSize: FontSize.h3, fontWeight: '800' },
  mealBody: { padding: Spacing.md },
  mealNutrients: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  nutrientPill: { borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  nutrientText: { fontSize: 11, fontWeight: '700' },
  mealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  prepTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prepTimeText: { color: Colors.textTertiary, fontSize: FontSize.caption },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: Spacing.md },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.caption },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '700' },
  emptyText: { color: Colors.textTertiary, fontSize: FontSize.small, marginTop: 4 },
  loadingState: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },
});
