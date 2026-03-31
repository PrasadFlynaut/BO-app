import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  TextInput, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const FILTERS = ['All', 'Nearby', 'Top Rated', 'BO Verified', 'BO Partner'];

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    try {
      const [progRes, restRes] = await Promise.all([
        api.get('/wellness-programs'),
        api.get('/restaurants?limit=10&sort=rating'),
      ]);
      setPrograms(progRes.data.programs || []);
      setRestaurants(restRes.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) { loadData(); return; }
    try {
      const { data } = await api.get(`/restaurants/search?q=${encodeURIComponent(q)}`);
      setRestaurants(data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleFilter = async (filter: string) => {
    setActiveFilter(filter);
    let params = '';
    if (filter === 'Top Rated') params = '?min_rating=4&sort=rating';
    else if (filter === 'BO Verified') params = '?bo_verified=true';
    else if (filter === 'BO Partner') params = '?bo_partner=true';
    else params = '?sort=rating';
    try {
      const endpoint = filter === 'Nearby' ? '/restaurants/search' : '/restaurants/search';
      const { data } = await api.get(`${endpoint}${params}`);
      setRestaurants(data.data || []);
    } catch (e) { console.error(e); }
  };

  const QUICK_ADDS = [
    { icon: 'sunny-outline', label: 'Breakfast', color: '#FFB74D' },
    { icon: 'restaurant-outline', label: 'Lunch', color: Colors.green },
    { icon: 'moon-outline', label: 'Dinner', color: Colors.waterBlue },
    { icon: 'cafe-outline', label: 'Snack', color: Colors.fitnessPurple },
    { icon: 'water-outline', label: 'Water', color: Colors.waterBlue },
    { icon: 'barbell-outline', label: 'Exercise', color: Colors.nutritionOrange },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        {/* Greeting + Profile */}
        <View style={s.greetRow}>
          <View>
            <Text style={s.greeting}>{greeting}, {firstName}!</Text>
            <Text style={s.greetSub}>Let us find your healthiest meal today</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={s.avatar}>
            <Ionicons name="person" size={20} color={Colors.green} />
          </TouchableOpacity>
        </View>

        {/* Wellness Programs */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Wellness Programs</Text>
            <TouchableOpacity><Text style={s.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.progScroll}>
            {programs.map((p, i) => (
              <TouchableOpacity key={p.id || i} style={s.progCard} activeOpacity={0.85}>
                <Image source={{ uri: p.image_url }} style={s.progImg} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={s.progOverlay}>
                  <View style={s.durationBadge}>
                    <Text style={s.durationText}>{p.duration_days} Days</Text>
                  </View>
                  <Text style={s.progTitle}>{p.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Quick Add */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <TouchableOpacity style={[s.quickAddBtn, Shadow.md]} onPress={() => setShowQuickAdd(!showQuickAdd)} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.quickAddGrad}>
              <Ionicons name={showQuickAdd ? 'close' : 'add'} size={24} color="#FFF" />
              <Text style={s.quickAddText}>Quick Add</Text>
            </LinearGradient>
          </TouchableOpacity>
          {showQuickAdd && (
            <View style={s.quickAddGrid}>
              {QUICK_ADDS.map((qa, i) => (
                <TouchableOpacity key={i} style={s.qaItem} activeOpacity={0.7}>
                  <View style={[s.qaIcon, { backgroundColor: qa.color + '15' }]}>
                    <Ionicons name={qa.icon as any} size={22} color={qa.color} />
                  </View>
                  <Text style={s.qaLabel}>{qa.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Location + Search */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={s.locationRow}>
            <Ionicons name="location" size={16} color={Colors.green} />
            <Text style={s.locationText}>New York, NY</Text>
          </View>

          <Text style={s.findTitle}>Find your healthiest meal today</Text>

          <View style={s.searchRow}>
            <Ionicons name="search" size={18} color={Colors.textTertiary} />
            <TextInput
              style={s.searchInput}
              placeholder="Search restaurants, cuisines..."
              placeholderTextColor={Colors.textTertiary}
              value={search}
              onChangeText={handleSearch}
            />
            <TouchableOpacity><Ionicons name="options-outline" size={18} color={Colors.textTertiary} /></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f} style={[s.filterChip, activeFilter === f && s.filterActive]} onPress={() => handleFilter(f)} activeOpacity={0.7}>
                <Text style={[s.filterText, activeFilter === f && s.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Restaurant List */}
        {loading ? (
          <View style={s.loadingWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
        ) : restaurants.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
            <Text style={s.emptyText}>No restaurants found nearby</Text>
            <Text style={s.emptySubtext}>Try expanding your search</Text>
          </View>
        ) : (
          restaurants.map((r, i) => (
            <Animated.View key={r.id || i} entering={FadeInDown.delay(400 + i * 60).duration(400)}>
              <TouchableOpacity style={[s.restCard, Shadow.sm]} onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })} activeOpacity={0.85}>
                <Image source={{ uri: r.image_url }} style={s.restImg} />
                {r.bo_verified && (
                  <View style={s.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                    <Text style={s.verifiedText}>BO Verified</Text>
                  </View>
                )}
                {r.bo_partner && !r.bo_verified && (
                  <View style={[s.verifiedBadge, { backgroundColor: Colors.nutritionOrange }]}>
                    <Ionicons name="handshake-outline" size={12} color="#FFF" />
                    <Text style={s.verifiedText}>BO Partner</Text>
                  </View>
                )}
                <View style={s.restBody}>
                  <Text style={s.restName}>{r.name}</Text>
                  <Text style={s.restCuisine}>{(r.cuisines || []).join(', ')}</Text>
                  <View style={s.restMeta}>
                    <View style={s.ratingRow}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={s.ratingText}>{r.average_rating || '0.0'}</Text>
                      <Text style={s.ratingCount}>({r.total_ratings || 0})</Text>
                    </View>
                    {r.distance_miles && (
                      <View style={s.distRow}>
                        <Ionicons name="location-outline" size={14} color={Colors.textTertiary} />
                        <Text style={s.distText}>{r.distance_miles} mi</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  greetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 24 },
  greeting: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  greetSub: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.green },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: FontSize.small, color: Colors.green, fontWeight: '600' },

  progScroll: { paddingLeft: Spacing.lg, gap: 12 },
  progCard: { width: 280, height: 160, borderRadius: Radius.lg, overflow: 'hidden' },
  progImg: { width: '100%', height: '100%' },
  progOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', justifyContent: 'flex-end', padding: 16 },
  durationBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  durationText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  progTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },

  quickAddBtn: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
  quickAddGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  quickAddText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
  quickAddGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, marginTop: Spacing.sm, gap: Spacing.sm },
  qaItem: { width: '30%' as any, alignItems: 'center', padding: 12, backgroundColor: Colors.bgBase, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderLight },
  qaIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  qaLabel: { fontSize: FontSize.caption, fontWeight: '600', color: Colors.textPrimary },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  locationText: { fontSize: FontSize.small, color: Colors.textSecondary, fontWeight: '500' },
  findTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },

  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.greenLight, borderRadius: Radius.lg, marginHorizontal: Spacing.lg, marginTop: Spacing.md, paddingHorizontal: 14, height: 48, gap: 8 },
  searchInput: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary, outlineStyle: 'none' as any },

  filterScroll: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 },
  filterChip: { borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgBase },
  filterActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  filterText: { fontSize: FontSize.small, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.green, fontWeight: '700' },

  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: FontSize.small, color: Colors.textTertiary },

  restCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.borderLight },
  restImg: { width: '100%', height: 180 },
  verifiedBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  verifiedText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  restBody: { padding: 14 },
  restName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  restCuisine: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 4 },
  restMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: FontSize.small, fontWeight: '700', color: Colors.textPrimary },
  ratingCount: { fontSize: FontSize.caption, color: Colors.textTertiary },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distText: { fontSize: FontSize.small, color: Colors.textSecondary },
});
