import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const QUOTES = [
  { text: "The food you eat can be either the safest and most powerful form of medicine or the slowest form of poison.", author: "Ann Wigmore" },
  { text: "Let food be thy medicine and medicine be thy food.", author: "Hippocrates" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Eat breakfast like a king, lunch like a prince, and dinner like a pauper.", author: "Adelle Davis" },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const load = async () => {
    try {
      const { data } = await api.get('/dashboard');
      setDashboard(data);
    } catch (e) { console.error(e); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

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

  const waterPercent = dashboard ? Math.min((dashboard.water_ml / dashboard.water_goal_ml) * 100, 100) : 0;
  const calPercent = dashboard ? Math.min((dashboard.calories / dashboard.calorie_goal) * 100, 100) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}>
        {/* Header with BO Logo */}
        <View style={styles.header}>
          <View>
            <Image source={{ uri: 'https://customer-assets.emergentagent.com/job_78422c49-5348-441f-bc53-d90eaaac0909/artifacts/9yt4dytf_BO_Logo_Color.png' }} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.tagline}>for your health on the go</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity testID="notifications-btn" style={styles.iconBtn}>
              <Ionicons name="notifications" size={24} color={Colors.green} />
            </TouchableOpacity>
            <TouchableOpacity testID="favorites-btn" style={styles.iconBtn}>
              <Ionicons name="heart" size={24} color={Colors.green} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingLabel}>Greetings </Text>
          <Text style={styles.greetingName}>{user?.name || 'User'}</Text>
        </View>

        {/* Quote Card */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>- by {quote.author}</Text>
        </View>

        {/* Quick Add Section */}
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <Text style={styles.sectionSubtitle}>BO can help you find healthy food</Text>

        <View style={styles.quickGrid}>
          <TouchableOpacity testID="quick-add-water" style={styles.quickBtn} onPress={() => quickAdd('water', 250)} activeOpacity={0.7}>
            <View style={[styles.quickIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="water-outline" size={22} color="#2196F3" />
            </View>
            <Text style={styles.quickLabel}>Water</Text>
            <Text style={styles.quickSub}>+250ml</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-add-breakfast" style={styles.quickBtn} onPress={() => quickAdd('breakfast', 350)} activeOpacity={0.7}>
            <View style={[styles.quickIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="sunny-outline" size={22} color="#FF9800" />
            </View>
            <Text style={styles.quickLabel}>Breakfast</Text>
            <Text style={styles.quickSub}>~350cal</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-add-lunch" style={styles.quickBtn} onPress={() => quickAdd('lunch', 500)} activeOpacity={0.7}>
            <View style={[styles.quickIcon, { backgroundColor: Colors.greenLight }]}>
              <Ionicons name="restaurant-outline" size={22} color={Colors.green} />
            </View>
            <Text style={styles.quickLabel}>Lunch</Text>
            <Text style={styles.quickSub}>~500cal</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-add-dinner" style={styles.quickBtn} onPress={() => quickAdd('dinner', 600)} activeOpacity={0.7}>
            <View style={[styles.quickIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="moon-outline" size={22} color="#9C27B0" />
            </View>
            <Text style={styles.quickLabel}>Dinner</Text>
            <Text style={styles.quickSub}>~600cal</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Stats */}
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="water" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{dashboard?.water_ml || 0}ml</Text>
            <Text style={styles.statLabel}>Water</Text>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${waterPercent}%`, backgroundColor: '#2196F3' }]} /></View>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color="#FF5722" />
            <Text style={styles.statValue}>{Math.round(dashboard?.calories || 0)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${calPercent}%`, backgroundColor: '#FF5722' }]} /></View>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="restaurant" size={24} color={Colors.green} />
            <Text style={styles.statValue}>{dashboard?.meals_logged || 0}</Text>
            <Text style={styles.statLabel}>Meals</Text>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.macroCard}>
          <Text style={styles.macroTitle}>Today's Macros</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: '#FF5252' }]}>{Math.round(dashboard?.protein_g || 0)}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: '#FFC107' }]}>{Math.round(dashboard?.carbs_g || 0)}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: Colors.green }]}>{Math.round(dashboard?.fat_g || 0)}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  headerLogo: { width: 60, height: 60 },
  tagline: { color: Colors.green, fontSize: 11, fontWeight: '500', marginTop: -4 },
  headerIcons: { flexDirection: 'row', gap: Spacing.sm, marginTop: 10 },
  iconBtn: { padding: 4 },
  greetingRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.md },
  greetingLabel: { color: Colors.textSecondary, fontSize: FontSize.body },
  greetingName: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '700' },
  quoteCard: { backgroundColor: Colors.green, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  quoteText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '500', lineHeight: 24, fontStyle: 'italic' },
  quoteAuthor: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.caption, marginTop: Spacing.sm, textAlign: 'right' },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  sectionSubtitle: { color: Colors.textSecondary, fontSize: FontSize.caption, textAlign: 'center', marginBottom: Spacing.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickBtn: { width: '48%', backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, flexGrow: 1, alignItems: 'center' },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  quickLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '600' },
  quickSub: { color: Colors.textMuted, fontSize: FontSize.small },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '700', marginTop: Spacing.xs },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.small, marginTop: 2 },
  progressBg: { height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2, marginTop: Spacing.sm, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  macroCard: { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  macroTitle: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.md },
  macroRow: { flexDirection: 'row', alignItems: 'center' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: FontSize.h3, fontWeight: '700' },
  macroLabel: { color: Colors.textMuted, fontSize: FontSize.small, marginTop: 2 },
  macroDivider: { width: 1, height: 40, backgroundColor: Colors.border },
});
