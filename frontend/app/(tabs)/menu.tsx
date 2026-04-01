import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TextInput, FlatList, Modal, Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - Spacing.lg * 2 - Spacing.sm) / 2;

const CATEGORIES = ['All', 'Healthy', 'Vegan', 'Mediterranean', 'Clean Eating', 'Balanced', 'High Protein', 'Keto'];
const MEAL_TYPES = ['All', 'breakfast', 'lunch', 'dinner', 'snack', 'brunch', 'tea', 'all-day'];

const SLOT_ICONS: Record<string, string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
};
const SLOT_COLORS: Record<string, [string, string]> = {
  breakfast: ['#FFB74D', '#FF9800'],
  lunch: ['#26B50F', '#1E8F0C'],
  dinner: ['#3A86FF', '#1A56CC'],
};

type ViewMode = 'browse' | 'favorites' | 'mealplan';

export default function CulinaryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [meals, setMeals] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [todayPlan, setTodayPlan] = useState<any[]>([]);
  const [weekPlan, setWeekPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planDay, setPlanDay] = useState(0); // 0 = today

  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(useCallback(() => {
    loadMeals(1, true);
    loadTodayPlan();
    loadFavorites();
  }, []));

  const loadMeals = async (p: number = 1, reset = false) => {
    if (reset) setLoading(true);
    try {
      const params: any = { page: p, limit: 10 };
      if (activeCategory !== 'All') params.category = activeCategory;

      let res;
      if (search.trim()) {
        res = await api.get('/v1/meals/search', { params: { ...params, q: search.trim() } });
      } else {
        res = await api.get('/v1/meals', { params });
      }
      const newMeals = res.data.data || [];
      if (reset) { setMeals(newMeals); } else { setMeals(prev => [...prev, ...newMeals]); }
      setHasMore(res.data.pagination?.hasNext || false);
      setPage(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadFavorites = async () => {
    try {
      const { data } = await api.get('/v1/meals/favorites?limit=20');
      setFavorites(data.data || []);
    } catch (e) { console.error(e); }
  };

  const loadTodayPlan = async () => {
    try {
      const { data } = await api.get(`/v1/meal-plan?date=${today}`);
      setTodayPlan(data.plans || []);
    } catch (e) { console.error(e); }
  };

  const loadWeekPlan = async () => {
    const start = new Date();
    start.setDate(start.getDate() + planDay * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    try {
      const { data } = await api.get(`/v1/meal-plan?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`);
      setWeekPlan(data.plans || []);
    } catch (e) { console.error(e); }
  };

  const deletePlanItem = async (planId: string) => {
    try {
      await api.delete(`/v1/meal-plan/${planId}`);
      setTodayPlan(prev => prev.filter(p => p.id !== planId));
      setWeekPlan(prev => prev.filter(p => p.id !== planId));
    } catch (e) { console.error(e); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMeals(1, true), loadTodayPlan(), loadFavorites()]);
    setRefreshing(false);
  };

  const onCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setTimeout(() => loadMeals(1, true), 0);
  };

  const onSearch = () => { loadMeals(1, true); };

  const loadMore = () => {
    if (!hasMore || loading) return;
    loadMeals(page + 1, false);
  };

  const openMealPlanCalendar = () => {
    setShowPlanModal(true);
    loadWeekPlan();
  };

  const getWeekDates = () => {
    const dates = [];
    const start = new Date();
    start.setDate(start.getDate() + planDay * 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push({
        date: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: d.toISOString().split('T')[0] === today,
      });
    }
    return dates;
  };

  const getMealForSlot = (date: string, slot: string) => {
    return weekPlan.find(p => p.date === date && p.meal_slot === slot);
  };

  // ========== RENDER MEAL CARD ==========
  const MealCard = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(350)}>
      <TouchableOpacity
        style={[cs.mealCard, Shadow.sm]}
        onPress={() => router.push(`/meal/${item.id}`)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: item.image_url }} style={cs.mealImg} contentFit="cover" transition={200} />
        <View style={cs.mealInfo}>
          <Text style={cs.mealTitle} numberOfLines={2}>{item.title}</Text>
          <View style={cs.mealMeta}>
            <View style={cs.metaChip}>
              <Ionicons name="flame-outline" size={12} color={Colors.nutritionOrange} />
              <Text style={cs.metaText}>{item.calories} cal</Text>
            </View>
            <View style={cs.metaChip}>
              <Ionicons name="barbell-outline" size={12} color={Colors.fitnessPurple} />
              <Text style={cs.metaText}>{item.proteins}g</Text>
            </View>
          </View>
          <View style={cs.mealTagRow}>
            <Text style={cs.mealTag}>{item.category}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={cs.safe} edges={['top']}>
      {/* Header */}
      <View style={cs.header}>
        <View style={{ flex: 1 }}>
          <Text style={cs.headerTitle}>Culinary Blueprint</Text>
          <Text style={cs.headerSub}>Browse meals, plan your week</Text>
        </View>
        <TouchableOpacity style={cs.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.green} />
        </TouchableOpacity>
      </View>

      {/* View mode tabs */}
      <View style={cs.viewTabRow}>
        {[
          { key: 'browse' as ViewMode, label: 'Browse', icon: 'grid-outline' },
          { key: 'favorites' as ViewMode, label: 'Favorites', icon: 'heart-outline' },
          { key: 'mealplan' as ViewMode, label: 'Meal Plan', icon: 'calendar-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[cs.viewTab, viewMode === tab.key && cs.viewTabActive]}
            onPress={() => {
              setViewMode(tab.key);
              if (tab.key === 'favorites') loadFavorites();
              if (tab.key === 'mealplan') loadTodayPlan();
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={viewMode === tab.key ? '#FFF' : Colors.textSecondary}
            />
            <Text style={[cs.viewTabText, viewMode === tab.key && cs.viewTabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* BROWSE VIEW */}
      {viewMode === 'browse' && (
        <>
          {/* Meals Grid with header */}
          {loading ? (
            <View style={cs.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
          ) : (
            <FlatList
              data={meals}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => <MealCard item={item} index={index} />}
              numColumns={2}
              columnWrapperStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}
              contentContainerStyle={{ paddingBottom: 120, gap: Spacing.sm }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListHeaderComponent={
                <View>
                  {/* Search */}
                  <View style={cs.searchRow}>
                    <View style={cs.searchBox}>
                      <Ionicons name="search" size={18} color={Colors.textTertiary} />
                      <TextInput
                        style={cs.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search meals..."
                        placeholderTextColor={Colors.textTertiary}
                        onSubmitEditing={onSearch}
                        returnKeyType="search"
                      />
                      {search ? (
                        <TouchableOpacity onPress={() => { setSearch(''); setTimeout(() => loadMeals(1, true), 0); }}>
                          <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* Category chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cs.chipScroll}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[cs.chip, activeCategory === cat && cs.chipActive]}
                        onPress={() => onCategoryChange(cat)}
                      >
                        <Text style={[cs.chipText, activeCategory === cat && cs.chipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Today's Plan Summary */}
                  {todayPlan.length > 0 && (
                    <Animated.View entering={FadeIn.duration(350)} style={cs.todayPlanBar}>
                      <Ionicons name="calendar" size={16} color={Colors.green} />
                      <Text style={cs.todayPlanText}>
                        {todayPlan.length} meal{todayPlan.length !== 1 ? 's' : ''} planned today
                      </Text>
                      <TouchableOpacity onPress={() => setViewMode('mealplan')}>
                        <Text style={cs.todayPlanLink}>View Plan</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </View>
              }
              ListEmptyComponent={
                <View style={cs.emptyWrap}>
                  <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
                  <Text style={cs.emptyText}>No meals found</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* FAVORITES VIEW */}
      {viewMode === 'favorites' && (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFavorites().then(() => setRefreshing(false)); }} tintColor={Colors.green} />}
        >
          {favorites.length === 0 ? (
            <View style={cs.emptyWrap}>
              <Ionicons name="heart-outline" size={48} color={Colors.textTertiary} />
              <Text style={cs.emptyText}>No favorites yet</Text>
              <Text style={cs.emptySubtext}>Browse meals and tap the heart to save them here</Text>
            </View>
          ) : (
            favorites.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 50).duration(350)}>
                <TouchableOpacity
                  style={[cs.favCard, Shadow.sm]}
                  onPress={() => router.push(`/meal/${item.id}`)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: item.image_url }} style={cs.favImg} contentFit="cover" transition={200} />
                  <View style={cs.favInfo}>
                    <Text style={cs.favTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={cs.favMeta}>{item.category} · {item.calories} cal</Text>
                    <Text style={cs.favMeta}>{item.proteins}g protein · {item.fat}g fat · {item.carbs}g carbs</Text>
                  </View>
                  <Ionicons name="heart" size={20} color="#E53E3E" />
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {/* MEAL PLAN VIEW */}
      {viewMode === 'mealplan' && (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTodayPlan().then(() => setRefreshing(false)); }} tintColor={Colors.green} />}
        >
          {/* Today's Plan */}
          <Text style={cs.planSectionTitle}>Today's Plan</Text>
          {['breakfast', 'lunch', 'dinner'].map(slot => {
            const planned = todayPlan.find(p => p.meal_slot === slot);
            return (
              <Animated.View key={slot} entering={FadeInDown.duration(350)}>
                <View style={[cs.planSlot, Shadow.sm]}>
                  <LinearGradient colors={SLOT_COLORS[slot] || ['#ccc', '#aaa']} style={cs.planSlotIcon}>
                    <Ionicons name={(SLOT_ICONS[slot] || 'restaurant-outline') as any} size={20} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={cs.planSlotName}>{slot.charAt(0).toUpperCase() + slot.slice(1)}</Text>
                    {planned ? (
                      <View style={cs.plannedMealRow}>
                        {planned.meal_image ? (
                          <Image source={{ uri: planned.meal_image }} style={cs.plannedMealImg} />
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Text style={cs.plannedMealTitle} numberOfLines={1}>{planned.meal_title}</Text>
                          <Text style={cs.plannedMealCal}>{planned.meal_calories} cal</Text>
                        </View>
                        <TouchableOpacity onPress={() => deletePlanItem(planned.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="close-circle-outline" size={20} color={Colors.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => { setViewMode('browse'); }} style={cs.addMealBtn}>
                        <Ionicons name="add" size={16} color={Colors.green} />
                        <Text style={cs.addMealText}>Browse & add a meal</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          })}

          {/* Week View Button */}
          <TouchableOpacity style={[cs.weekViewBtn, Shadow.sm]} onPress={openMealPlanCalendar} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.green, Colors.greenDark]} style={cs.weekViewGrad}>
              <Ionicons name="calendar-outline" size={20} color="#FFF" />
              <Text style={cs.weekViewText}>View Weekly Calendar</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Total calories today */}
          {todayPlan.length > 0 && (
            <View style={[cs.calSummary, Shadow.sm]}>
              <Text style={cs.calSummaryTitle}>Today's Summary</Text>
              <View style={cs.calSummaryRow}>
                <View style={cs.calItem}>
                  <Text style={[cs.calNum, { color: Colors.nutritionOrange }]}>{todayPlan.reduce((s, p) => s + (p.meal_calories || 0), 0)}</Text>
                  <Text style={cs.calLabel}>Total Cal</Text>
                </View>
                <View style={cs.calItem}>
                  <Text style={[cs.calNum, { color: Colors.green }]}>{todayPlan.length}</Text>
                  <Text style={cs.calLabel}>Meals</Text>
                </View>
                <View style={cs.calItem}>
                  <Text style={[cs.calNum, { color: Colors.waterBlue }]}>{3 - todayPlan.length}</Text>
                  <Text style={cs.calLabel}>Slots Open</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Week Calendar Modal */}
      <Modal visible={showPlanModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={cs.calHeader}>
            <TouchableOpacity onPress={() => setShowPlanModal(false)}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={cs.calTitle}>Weekly Meal Plan</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Week nav */}
          <View style={cs.weekNav}>
            <TouchableOpacity onPress={() => { setPlanDay(planDay - 1); setTimeout(loadWeekPlan, 100); }}>
              <Ionicons name="chevron-back" size={24} color={Colors.green} />
            </TouchableOpacity>
            <Text style={cs.weekNavText}>
              {planDay === 0 ? 'This Week' : planDay === 1 ? 'Next Week' : planDay === -1 ? 'Last Week' : `Week ${planDay > 0 ? '+' : ''}${planDay}`}
            </Text>
            <TouchableOpacity onPress={() => { setPlanDay(planDay + 1); setTimeout(loadWeekPlan, 100); }}>
              <Ionicons name="chevron-forward" size={24} color={Colors.green} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
            {getWeekDates().map(day => (
              <View key={day.date} style={[cs.weekDayCard, day.isToday && cs.weekDayToday]}>
                <View style={cs.weekDayHeader}>
                  <Text style={[cs.weekDayName, day.isToday && { color: Colors.green }]}>
                    {day.dayName} {day.dayNum}
                  </Text>
                  {day.isToday && <View style={cs.todayBadge}><Text style={cs.todayBadgeText}>Today</Text></View>}
                </View>
                {['breakfast', 'lunch', 'dinner'].map(slot => {
                  const planned = getMealForSlot(day.date, slot);
                  return (
                    <View key={slot} style={cs.weekSlotRow}>
                      <Text style={cs.weekSlotLabel}>{slot.charAt(0).toUpperCase() + slot.slice(1)}</Text>
                      {planned ? (
                        <View style={cs.weekSlotMeal}>
                          <Text style={cs.weekSlotMealTitle} numberOfLines={1}>{planned.meal_title}</Text>
                          <Text style={cs.weekSlotMealCal}>{planned.meal_calories} cal</Text>
                          <TouchableOpacity onPress={() => deletePlanItem(planned.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle-outline" size={16} color={Colors.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={cs.weekSlotEmpty}>-</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 2 },
  profileBtn: {},

  // View tabs
  viewTabRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: '#FFF' },
  viewTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.lg, backgroundColor: '#F5F5F5' },
  viewTabActive: { backgroundColor: Colors.green },
  viewTabText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  viewTabTextActive: { color: '#FFF' },

  // Search
  searchRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#F5F5F5', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.body },

  // Category chips
  chipScroll: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm, zIndex: 1 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill, backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  chipText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.green },

  // Today plan bar
  todayPlanBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, paddingVertical: 10, paddingHorizontal: Spacing.md, backgroundColor: Colors.greenLight, borderRadius: Radius.lg },
  todayPlanText: { flex: 1, fontSize: FontSize.small, color: Colors.textSecondary, fontWeight: '600' },
  todayPlanLink: { fontSize: FontSize.small, color: Colors.green, fontWeight: '700' },

  // Meal card
  mealCard: { width: CARD_W, backgroundColor: '#FFF', borderRadius: Radius.lg, overflow: 'hidden' },
  mealImg: { width: '100%', height: 120 },
  mealInfo: { padding: Spacing.sm },
  mealTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, lineHeight: 18 },
  mealMeta: { flexDirection: 'row', gap: Spacing.sm, marginTop: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600' },
  mealTagRow: { marginTop: 6 },
  mealTag: { fontSize: 10, color: Colors.green, fontWeight: '700', backgroundColor: Colors.greenLight, alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8, borderRadius: Radius.pill },

  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  emptySubtext: { fontSize: FontSize.small, color: Colors.textTertiary, textAlign: 'center' },

  // Favorites card
  favCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.sm },
  favImg: { width: 64, height: 64, borderRadius: Radius.md },
  favInfo: { flex: 1 },
  favTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  favMeta: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },

  // Meal plan view
  planSectionTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  planSlot: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  planSlotIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  planSlotName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  plannedMealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  plannedMealImg: { width: 40, height: 40, borderRadius: Radius.sm },
  plannedMealTitle: { fontSize: FontSize.small, color: Colors.textPrimary, fontWeight: '600' },
  plannedMealCal: { fontSize: FontSize.caption, color: Colors.textTertiary },
  addMealBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  addMealText: { fontSize: FontSize.small, color: Colors.green, fontWeight: '600' },

  weekViewBtn: { borderRadius: Radius.lg, overflow: 'hidden', marginTop: Spacing.md, marginBottom: Spacing.lg },
  weekViewGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16 },
  weekViewText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },

  calSummary: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md },
  calSummaryTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  calSummaryRow: { flexDirection: 'row', gap: Spacing.md },
  calItem: { flex: 1, alignItems: 'center' },
  calNum: { fontSize: FontSize.h3, fontWeight: '800' },
  calLabel: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },

  // Week calendar modal
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  calTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  weekNavText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  weekDayCard: { backgroundColor: '#F8FAF9', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  weekDayToday: { backgroundColor: Colors.greenLight, borderWidth: 1, borderColor: Colors.green },
  weekDayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  weekDayName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  todayBadge: { backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  todayBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  weekSlotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  weekSlotLabel: { width: 70, fontSize: FontSize.caption, color: Colors.textTertiary, fontWeight: '600' },
  weekSlotMeal: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  weekSlotMealTitle: { flex: 1, fontSize: FontSize.small, color: Colors.textPrimary, fontWeight: '600' },
  weekSlotMealCal: { fontSize: FontSize.caption, color: Colors.textTertiary },
  weekSlotEmpty: { fontSize: FontSize.small, color: Colors.textTertiary },
});
