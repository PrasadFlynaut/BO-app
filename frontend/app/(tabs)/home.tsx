import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/dashboard');
      setDashboard(data);
    } catch (e) { console.error(e); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const waterPercent = dashboard ? Math.min((dashboard.water_ml / dashboard.water_goal_ml) * 100, 100) : 0;
  const calPercent = dashboard ? Math.min((dashboard.calories / dashboard.calorie_goal) * 100, 100) : 0;

  const quickAdd = async (type: string, amount: number) => {
    try {
      if (type === 'water') {
        await api.post('/water/log', { amount_ml: amount });
      } else {
        await api.post('/nutrition/log', { meal_type: type, food_name: `Quick ${type}`, calories: amount, protein_g: amount * 0.1, carbs_g: amount * 0.15, fat_g: amount * 0.05 });
      }
      await load();
    } catch (e) { console.error(e); }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <Image source={{ uri: 'https://customer-assets.emergentagent.com/job_78422c49-5348-441f-bc53-d90eaaac0909/artifacts/349ony80_BO_Logo_White.png' }} style={styles.headerLogo} resizeMode="contain" />
        </View>

        {/* Daily Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="water" size={24} color="#4FC3F7" />
            <Text style={styles.statValue}>{dashboard?.water_ml || 0}ml</Text>
            <Text style={styles.statLabel}>Water</Text>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${waterPercent}%`, backgroundColor: '#4FC3F7' }]} /></View>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color={Colors.secondary} />
            <Text style={styles.statValue}>{Math.round(dashboard?.calories || 0)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${calPercent}%`, backgroundColor: Colors.secondary }]} /></View>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="restaurant" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{dashboard?.meals_logged || 0}</Text>
            <Text style={styles.statLabel}>Meals</Text>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.macroCard}>
          <Text style={styles.sectionTitle}>Today's Macros</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: '#FF6B6B' }]}>{Math.round(dashboard?.protein_g || 0)}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: '#FFD93D' }]}>{Math.round(dashboard?.carbs_g || 0)}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: '#6BCB77' }]}>{Math.round(dashboard?.fat_g || 0)}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Quick Add */}
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity testID="quick-add-water" style={styles.quickBtn} onPress={() => quickAdd('water', 250)} activeOpacity={0.7}>
            <Ionicons name="water-outline" size={22} color="#4FC3F7" />
            <Text style={styles.quickLabel}>Water</Text>
            <Text style={styles.quickSub}>+250ml</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-add-breakfast" style={styles.quickBtn} onPress={() => quickAdd('breakfast', 350)} activeOpacity={0.7}>
            <Ionicons name="sunny-outline" size={22} color="#FFD93D" />
            <Text style={styles.quickLabel}>Breakfast</Text>
            <Text style={styles.quickSub}>~350cal</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-add-lunch" style={styles.quickBtn} onPress={() => quickAdd('lunch', 500)} activeOpacity={0.7}>
            <Ionicons name="restaurant-outline" size={22} color={Colors.primary} />
            <Text style={styles.quickLabel}>Lunch</Text>
            <Text style={styles.quickSub}>~500cal</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-add-dinner" style={styles.quickBtn} onPress={() => quickAdd('dinner', 600)} activeOpacity={0.7}>
            <Ionicons name="moon-outline" size={22} color="#BB86FC" />
            <Text style={styles.quickLabel}>Dinner</Text>
            <Text style={styles.quickSub}>~600cal</Text>
          </TouchableOpacity>
        </View>

        {/* Weight Progress */}
        {dashboard?.weight_kg && (
          <View style={styles.weightCard}>
            <View style={styles.weightHeader}>
              <Ionicons name="trending-down" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Weight Progress</Text>
            </View>
            <View style={styles.weightRow}>
              <View style={styles.weightItem}>
                <Text style={styles.weightValue}>{dashboard.weight_kg}kg</Text>
                <Text style={styles.weightLabel}>Current</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} />
              <View style={styles.weightItem}>
                <Text style={[styles.weightValue, { color: Colors.primary }]}>{dashboard.target_weight_kg || '?'}kg</Text>
                <Text style={styles.weightLabel}>Target</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  greeting: { color: Colors.textSecondary, fontSize: FontSize.body },
  userName: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '700' },
  headerLogo: { width: 36, height: 36 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '700', marginTop: Spacing.xs },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.small, marginTop: 2 },
  progressBg: { height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2, marginTop: Spacing.sm, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  macroCard: { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.md },
  macroRow: { flexDirection: 'row', alignItems: 'center' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: FontSize.h3, fontWeight: '700' },
  macroLabel: { color: Colors.textMuted, fontSize: FontSize.small, marginTop: 2 },
  macroDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickBtn: { width: '48%', backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, flexGrow: 1 },
  quickLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '600', marginTop: Spacing.xs },
  quickSub: { color: Colors.textMuted, fontSize: FontSize.small },
  weightCard: { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  weightHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  weightItem: { alignItems: 'center' },
  weightValue: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '700' },
  weightLabel: { color: Colors.textMuted, fontSize: FontSize.small, marginTop: 2 },
});
