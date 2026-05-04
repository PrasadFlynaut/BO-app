import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, FlatList, Modal, Alert,
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
import EmptyState from '@/src/components/EmptyState';
import SearchBar from '@/src/components/SearchBar';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - Spacing.lg * 2 - Spacing.sm) / 2;

const CATEGORIES = ['All', 'Healthy', 'Vegan', 'Mediterranean', 'Clean Eating', 'Balanced', 'High Protein', 'Keto'];
const MEAL_TYPES = ['All', 'breakfast', 'lunch', 'dinner', 'snack', 'brunch'];

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

const boLogoGrey = require('../../assets/images/bo-logo-color.png');

function MealImage({ uri, style }: { uri?: string; style: any }) {
  const [failed, setFailed] = React.useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
        <Image source={boLogoGrey} style={{ width: '50%', height: '50%', opacity: 0.18 }} contentFit="contain" />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} contentFit="cover" transition={200} onError={() => setFailed(true)} />;
}

type MealCardProps = { item: any; index: number; onPress: () => void };
function MealCard({ item, index, onPress }: MealCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(350)}>
      <TouchableOpacity style={[cs.mealCard, Shadow.sm]} onPress={onPress} activeOpacity={0.85}>
        <MealImage uri={item.image_url} style={cs.mealImg} />
        <View style={cs.mealInfo}>
          <Text style={cs.mealTitle} numberOfLines={2}>{item.title}</Text>
          <View style={cs.mealMeta}>
            <View style={cs.metaChip}>
              <Ionicons name="flame-outline" size={12} color={Colors.nutritionOrange} />
              <Text style={cs.metaText}>{item.calories} fuel</Text>
            </View>
            <View style={cs.metaChip}>
              <Ionicons name="barbell-outline" size={12} color={Colors.fitnessPurple} />
              <Text style={cs.metaText}>{item.proteins}g</Text>
            </View>
          </View>
          {!!item.category && (
            <View style={cs.mealTagRow}>
              <Text style={cs.mealTag}>{item.category}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

type FavCardProps = { item: any; index: number; onPress: () => void };
function FavCard({ item, index, onPress }: FavCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(350)}>
      <TouchableOpacity style={[cs.favCard, Shadow.sm]} onPress={onPress} activeOpacity={0.85}>
        <MealImage uri={item.image_url} style={cs.favImg} />
        <View style={cs.favInfo}>
          <Text style={cs.favTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={cs.favMeta}>{item.category} · {item.calories} fuel</Text>
          <Text style={cs.favMeta}>{item.proteins}g protein · {item.fat}g fat · {item.carbs}g carbs</Text>
        </View>
        <Ionicons name="heart" size={20} color="#E53E3E" />
      </TouchableOpacity>
    </Animated.View>
  );
}

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
  const [activeMealType, setActiveMealType] = useState('All');
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planDay, setPlanDay] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(useCallback(() => {
    loadMeals(1, true, activeCategory, activeMealType, search);
    loadTodayPlan();
    loadFavorites();
  }, []));

  const loadMeals = async (
    p: number = 1,
    reset = false,
    cat: string = activeCategory,
    mType: string = activeMealType,
    q: string = search,
  ) => {
    if (reset) setLoading(true);
    try {
      const params: any = { page: p, limit: 10 };
      if (cat !== 'All') params.category = cat;
      if (mType !== 'All') params.mealType = mType;

      let res;
      if (q.trim()) {
        res = await api.get('/v1/meals/search', { params: { ...params, q: q.trim() } });
      } else {
        res = await api.get('/v1/meals', { params });
      }
      const newMeals = res.data.data || [];
      if (reset) setMeals(newMeals);
      else setMeals(prev => [...prev, ...newMeals]);
      setHasMore(res.data.pagination?.hasNext || false);
      setPage(p);
    } catch (e) { console.error(e); }
    if (reset) setLoading(false);
  };

  const loadFavorites = async () => {
    try {
      const { data } = await api.get('/v1/meals/favorites?limit=20');
      setFavorites(data.data || []);
    } catch {}
  };

  const loadTodayPlan = async () => {
    try {
      const { data } = await api.get(`/v1/meal-plan?date=${today}`);
      setTodayPlan(data.plans || []);
    } catch {}
  };

  const loadWeekPlan = async () => {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth() + planDay, 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    try {
      const { data } = await api.get(`/v1/meal-plan?startDate=${month.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`);
      setWeekPlan(data.plans || []);
    } catch {}
  };

  const deletePlanItem = async (planId: string) => {
    try {
      await api.delete(`/v1/meal-plan/${planId}`);
      setTodayPlan(prev => prev.filter(p => p.id !== planId));
      setWeekPlan(prev => prev.filter(p => p.id !== planId));
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMeals(1, true, activeCategory, activeMealType, search), loadTodayPlan(), loadFavorites()]);
    setRefreshing(false);
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    loadMeals(1, true, cat, activeMealType, search);
  };

  const handleMealTypeChange = (mType: string) => {
    setActiveMealType(mType);
    loadMeals(1, true, activeCategory, mType, search);
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    loadMeals(1, true, activeCategory, activeMealType, q);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    loadMeals(page + 1, false, activeCategory, activeMealType, search);
  };

  const openMealPlanCalendar = () => {
    setShowPlanModal(true);
    loadWeekPlan();
  };

  const renderBrowse = () => (
    loading ? (
      <View style={cs.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
    ) : (
      <FlatList
        data={meals}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={({ item, index }) => (
          <MealCard item={item} index={index} onPress={() => router.push(`/meal/${item.id}` as any)} />
        )}
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
            <View style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm }}>
              <SearchBar
                value={search}
                onChangeText={handleSearch}
                placeholder="Search meals..."
                style={cs.searchBox}
              />
            </View>

            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cs.chipScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[cs.chip, activeCategory === cat && cs.chipActive]}
                  onPress={() => handleCategoryChange(cat)}
                >
                  <Text style={[cs.chipText, activeCategory === cat && cs.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Meal type filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[cs.chipScroll, { paddingTop: 0 }]}>
              {MEAL_TYPES.map(mt => (
                <TouchableOpacity
                  key={mt}
                  style={[cs.typeChip, activeMealType === mt && cs.typeChipActive]}
                  onPress={() => handleMealTypeChange(mt)}
                >
                  <Text style={[cs.typeChipText, activeMealType === mt && cs.typeChipTextActive]}>
                    {mt.charAt(0).toUpperCase() + mt.slice(1)}
                  </Text>
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
          <EmptyState
            icon="restaurant-outline"
            title="No meals found"
            subtitle={search ? `No results for "${search}"` : 'Try a different category or filter.'}
            action={search ? { label: 'Clear search', onPress: () => handleSearch('') } : undefined}
            variant="green"
          />
        }
      />
    )
  );

  const renderFavorites = () => (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadFavorites().finally(() => setRefreshing(false)); }}
          tintColor={Colors.green}
        />
      }
    >
      {favorites.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No favorites yet"
          subtitle="Browse meals and tap the heart to save them here."
          action={{ label: 'Browse Meals', onPress: () => setViewMode('browse') }}
          variant="orange"
        />
      ) : (
        favorites.map((item, index) => (
          <FavCard
            key={item.id || index}
            item={item}
            index={index}
            onPress={() => router.push(`/meal/${item.id}` as any)}
          />
        ))
      )}
    </ScrollView>
  );

  const renderMealPlan = () => (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadTodayPlan().finally(() => setRefreshing(false)); }}
          tintColor={Colors.green}
        />
      }
    >
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
                      <Image source={{ uri: planned.meal_image }} style={cs.plannedMealImg} contentFit="cover" />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={cs.plannedMealTitle} numberOfLines={1}>{planned.meal_title}</Text>
                      <Text style={cs.plannedMealCal}>{planned.meal_calories} fuel</Text>
                    </View>
                    <TouchableOpacity onPress={() => deletePlanItem(planned.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle-outline" size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setViewMode('browse')} style={cs.addMealBtn}>
                    <Ionicons name="add" size={16} color={Colors.green} />
                    <Text style={cs.addMealText}>Browse & add a meal</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>
        );
      })}

      <TouchableOpacity style={[cs.weekViewBtn, Shadow.sm]} onPress={openMealPlanCalendar} activeOpacity={0.8}>
        <LinearGradient colors={[Colors.green, Colors.greenDark]} style={cs.weekViewGrad}>
          <Ionicons name="calendar-outline" size={20} color="#FFF" />
          <Text style={cs.weekViewText}>View Monthly Calendar</Text>
        </LinearGradient>
      </TouchableOpacity>

      {todayPlan.length > 0 && (
        <View style={[cs.calSummary, Shadow.sm]}>
          <Text style={cs.calSummaryTitle}>Today's Summary</Text>
          <View style={cs.calSummaryRow}>
            <View style={cs.calItem}>
              <Text style={[cs.calNum, { color: Colors.nutritionOrange }]}>
                {todayPlan.reduce((s, p) => s + (p.meal_calories || 0), 0)}
              </Text>
              <Text style={cs.calLabel}>Total Cal</Text>
            </View>
            <View style={cs.calItem}>
              <Text style={[cs.calNum, { color: Colors.green }]}>{todayPlan.length}</Text>
              <Text style={cs.calLabel}>Meals</Text>
            </View>
            <View style={cs.calItem}>
              <Text style={[cs.calNum, { color: Colors.waterBlue }]}>{Math.max(0, 3 - todayPlan.length)}</Text>
              <Text style={cs.calLabel}>Slots Open</Text>
            </View>
          </View>
        </View>
      )}

      {todayPlan.length === 0 && (
        <EmptyState
          icon="calendar-outline"
          title="No meals planned today"
          subtitle="Browse meals and add them to your plan."
          action={{ label: 'Browse Meals', onPress: () => setViewMode('browse') }}
          variant="blue"
          compact
        />
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={cs.safe} edges={['top']}>
      {/* Header */}
      <View style={cs.header}>
        <View style={{ flex: 1 }}>
          <Text style={cs.headerTitle}>Culinary Blueprint</Text>
          <Text style={cs.headerSub}>Browse meals, plan your week</Text>
        </View>
        <TouchableOpacity style={cs.profileBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.green} />
        </TouchableOpacity>
      </View>

      {/* View mode tabs */}
      <View style={cs.viewTabRow}>
        {([
          { key: 'browse' as ViewMode, label: 'Browse', icon: 'grid-outline' },
          { key: 'favorites' as ViewMode, label: 'Favorites', icon: 'heart-outline' },
          { key: 'mealplan' as ViewMode, label: 'Meal Planner', icon: 'calendar-outline' },
        ] as const).map(tab => (
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
            <Ionicons name={tab.icon as any} size={15} color={viewMode === tab.key ? '#FFF' : Colors.textSecondary} />
            <Text
              style={[cs.viewTabText, viewMode === tab.key && cs.viewTabTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewMode === 'browse' && renderBrowse()}
      {viewMode === 'favorites' && renderFavorites()}
      {viewMode === 'mealplan' && renderMealPlan()}

      {/* Monthly Calendar Modal */}
      <Modal visible={showPlanModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={cs.calHeader}>
            <TouchableOpacity onPress={() => setShowPlanModal(false)}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={cs.calTitle}>Monthly Meal Planner</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={cs.weekNav}>
            <TouchableOpacity onPress={() => { setPlanDay(planDay - 1); setTimeout(loadWeekPlan, 0); }}>
              <Ionicons name="chevron-back" size={24} color={Colors.green} />
            </TouchableOpacity>
            <Text style={cs.weekNavText}>
              {(() => {
                const d = new Date();
                d.setMonth(d.getMonth() + planDay);
                return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              })()}
            </Text>
            <TouchableOpacity onPress={() => { setPlanDay(planDay + 1); setTimeout(loadWeekPlan, 0); }}>
              <Ionicons name="chevron-forward" size={24} color={Colors.green} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 4 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textTertiary }}>{d}</Text>
              </View>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 4, paddingBottom: 40 }}>
            {(() => {
              const now = new Date();
              const month = new Date(now.getFullYear(), now.getMonth() + planDay, 1);
              const firstDay = month.getDay();
              const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
              const todayStr = new Date().toISOString().split('T')[0];
              const weeks: { date: string; day: number; isToday: boolean; inMonth: boolean }[][] = [];
              let week: { date: string; day: number; isToday: boolean; inMonth: boolean }[] = [];

              for (let i = 0; i < firstDay; i++) week.push({ date: '', day: 0, isToday: false, inMonth: false });
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                week.push({ date: dateStr, day: d, isToday: dateStr === todayStr, inMonth: true });
                if (week.length === 7) { weeks.push(week); week = []; }
              }
              while (week.length > 0 && week.length < 7) week.push({ date: '', day: 0, isToday: false, inMonth: false });
              if (week.length) weeks.push(week);

              return weeks.map((wk, wi) => (
                <View key={wi} style={{ flexDirection: 'row', marginBottom: 2 }}>
                  {wk.map((cell, ci) => {
                    const mealCount = cell.date ? weekPlan.filter((p: any) => p.date === cell.date).length : 0;
                    return (
                      <TouchableOpacity
                        key={ci}
                        style={[
                          cs.calCell,
                          cell.isToday && cs.calCellToday,
                          !cell.inMonth && { backgroundColor: 'transparent' },
                        ]}
                        activeOpacity={0.7}
                        disabled={!cell.inMonth}
                        onPress={() => {
                          if (!cell.date) return;
                          setShowPlanModal(false);
                          Alert.alert(
                            `Meals for ${cell.date}`,
                            mealCount > 0
                              ? weekPlan.filter((p: any) => p.date === cell.date).map((p: any) => `${p.meal_slot}: ${p.meal_title}`).join('\n')
                              : 'No meals planned. Browse meals to add!',
                            [{ text: 'OK' }]
                          );
                        }}
                      >
                        {cell.inMonth && (
                          <>
                            <Text style={[cs.calDayText, cell.isToday && cs.calDayTextToday]}>{cell.day}</Text>
                            {mealCount > 0 && (
                              <View style={{ flexDirection: 'row', marginTop: 2, gap: 2 }}>
                                {[...Array(Math.min(mealCount, 3))].map((_, i) => (
                                  <View key={i} style={[cs.calDot, { backgroundColor: i === 0 ? Colors.nutritionOrange : i === 1 ? Colors.green : Colors.waterBlue }]} />
                                ))}
                              </View>
                            )}
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()}

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: Spacing.lg }}>
              {[
                { color: Colors.nutritionOrange, label: 'Breakfast' },
                { color: Colors.green, label: 'Lunch' },
                { color: Colors.waterBlue, label: 'Dinner' },
              ].map(l => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
                  <Text style={{ fontSize: 11, color: Colors.textTertiary }}>{l.label}</Text>
                </View>
              ))}
            </View>
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

  viewTabRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: '#FFF' },
  viewTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 6, borderRadius: Radius.lg, backgroundColor: '#F5F5F5', minWidth: 0 },
  viewTabActive: { backgroundColor: Colors.green },
  viewTabText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary, flexShrink: 1 },
  viewTabTextActive: { color: '#FFF' },

  searchBox: { backgroundColor: '#F5F5F5', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10 },

  chipScroll: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill, backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  chipText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.green },

  typeChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.pill, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: 'transparent' },
  typeChipActive: { backgroundColor: Colors.waterBlue + '15', borderColor: Colors.waterBlue },
  typeChipText: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
  typeChipTextActive: { color: Colors.waterBlue },

  todayPlanBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, paddingVertical: 10, paddingHorizontal: Spacing.md, backgroundColor: Colors.greenLight, borderRadius: Radius.lg },
  todayPlanText: { flex: 1, fontSize: FontSize.small, color: Colors.textSecondary, fontWeight: '600' },
  todayPlanLink: { fontSize: FontSize.small, color: Colors.green, fontWeight: '700' },

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

  favCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.sm },
  favImg: { width: 64, height: 64, borderRadius: Radius.md },
  favInfo: { flex: 1 },
  favTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  favMeta: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },

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

  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  calTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  weekNavText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },

  calCell: { flex: 1, aspectRatio: 0.85, margin: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  calCellToday: { backgroundColor: Colors.green + '15', borderWidth: 1.5, borderColor: Colors.green },
  calDayText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  calDayTextToday: { fontWeight: '800', color: Colors.green },
  calDot: { width: 5, height: 5, borderRadius: 3 },
});
