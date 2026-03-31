import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import api from '@/src/api';

export default function MenuScreen() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => { loadPlans(); }, []));

  const loadPlans = async () => {
    try { const { data } = await api.get('/diet-plans'); setPlans(data.plans); } catch (e) { console.error(e); }
  };

  const selectPlan = async (planId: string) => {
    setSelectedPlan(planId); setLoading(true);
    try { const { data } = await api.get(`/diet-plans/${planId}`); setMeals(data.meals); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const PLAN_ICONS: Record<string, string> = { keto: 'flame', mediterranean: 'heart', vegan: 'leaf', 'clean-eating': 'sparkles', 'high-protein': 'barbell', balanced: 'scale' };

  const addMealToLog = async (meal: any) => {
    try { await api.post('/nutrition/log', { meal_type: meal.category, food_name: meal.name, calories: meal.calories, protein_g: meal.protein_g, carbs_g: meal.carbs_g, fat_g: meal.fat_g }); } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Smart Menu</Text>
      <Text style={styles.subtitle}>Choose a plan to explore meals</Text>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={plans} keyExtractor={item => item.id} contentContainerStyle={styles.planList}
        renderItem={({ item }) => (
          <TouchableOpacity testID={`plan-${item.id}`} style={[styles.planChip, selectedPlan === item.id && styles.planChipActive]} onPress={() => selectPlan(item.id)} activeOpacity={0.7}>
            <Ionicons name={(PLAN_ICONS[item.id] || 'nutrition') as any} size={18} color={selectedPlan === item.id ? '#FFF' : Colors.textSecondary} />
            <Text style={[styles.planChipText, selectedPlan === item.id && styles.planChipTextActive]}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
      {selectedPlan && plans.find(p => p.id === selectedPlan) && (
        <View style={styles.planInfo}>
          <Text style={styles.planDesc}>{plans.find(p => p.id === selectedPlan)?.description}</Text>
          <View style={styles.planMeta}>
            <Text style={styles.planMetaText}>{plans.find(p => p.id === selectedPlan)?.duration_days} days</Text>
            <Text style={styles.planMetaDot}>|</Text>
            <Text style={styles.planMetaText}>{plans.find(p => p.id === selectedPlan)?.calories_range} cal</Text>
            <Text style={styles.planMetaDot}>|</Text>
            <Text style={[styles.planMetaText, { color: Colors.green }]}>{plans.find(p => p.id === selectedPlan)?.difficulty}</Text>
          </View>
        </View>
      )}
      <FlatList style={{ flex: 1 }} data={meals} keyExtractor={item => item.id} contentContainerStyle={styles.mealList}
        ListEmptyComponent={!selectedPlan ? <View style={styles.emptyState}><Ionicons name="restaurant-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>Select a diet plan above</Text></View> : loading ? <Text style={styles.loadingText}>Loading...</Text> : meals.length === 0 ? <Text style={styles.loadingText}>No meals found</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.mealCard}>
            <Image source={{ uri: item.image_url }} style={styles.mealImage} />
            <View style={styles.mealOverlay}><Text style={styles.mealCategory}>{item.category}</Text></View>
            <View style={styles.mealBody}>
              <Text style={styles.mealName}>{item.name}</Text>
              <Text style={styles.mealDesc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.mealNutrients}>
                <Text style={styles.nutrient}>{item.calories} cal</Text>
                <Text style={styles.nutrientDot}>|</Text>
                <Text style={styles.nutrient}>P: {item.protein_g}g</Text>
                <Text style={styles.nutrientDot}>|</Text>
                <Text style={styles.nutrient}>C: {item.carbs_g}g</Text>
                <Text style={styles.nutrientDot}>|</Text>
                <Text style={styles.nutrient}>F: {item.fat_g}g</Text>
              </View>
              <View style={styles.mealFooter}>
                <View style={styles.prepTime}><Ionicons name="time-outline" size={14} color={Colors.textMuted} /><Text style={styles.prepTimeText}>{item.prep_time} min</Text></View>
                <TouchableOpacity testID={`add-meal-${item.id}`} style={styles.addBtn} onPress={() => addMealToLog(item)} activeOpacity={0.7}>
                  <Ionicons name="add" size={18} color="#FFF" /><Text style={styles.addBtnText}>Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  title: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '700', paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  planList: { paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  planChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, paddingVertical: 10, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  planChipActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  planChipText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.caption },
  planChipTextActive: { color: '#FFF' },
  planInfo: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  planDesc: { color: Colors.textSecondary, fontSize: FontSize.caption, lineHeight: 20 },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  planMetaText: { color: Colors.textMuted, fontSize: FontSize.small, fontWeight: '600' },
  planMetaDot: { color: Colors.border },
  mealList: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  mealCard: { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  mealImage: { width: '100%', height: 160 },
  mealOverlay: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, backgroundColor: Colors.green, borderRadius: Radius.sm, paddingVertical: 4, paddingHorizontal: Spacing.sm },
  mealCategory: { color: '#FFF', fontSize: FontSize.small, fontWeight: '700', textTransform: 'uppercase' },
  mealBody: { padding: Spacing.md },
  mealName: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '700' },
  mealDesc: { color: Colors.textSecondary, fontSize: FontSize.caption, marginTop: 4, lineHeight: 18 },
  mealNutrients: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  nutrient: { color: Colors.textMuted, fontSize: FontSize.small, fontWeight: '600' },
  nutrientDot: { color: Colors.border },
  mealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  prepTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prepTimeText: { color: Colors.textMuted, fontSize: FontSize.small },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.green, borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: Spacing.md },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.caption },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.md },
  loadingText: { color: Colors.textMuted, textAlign: 'center', paddingTop: 40, fontSize: FontSize.body },
});
