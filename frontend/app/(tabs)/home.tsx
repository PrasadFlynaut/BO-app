import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  TextInput, ActivityIndicator, RefreshControl, Modal, Alert,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, SlideInDown, SlideOutDown, useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
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

  // Active program state
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [activeProgramData, setActiveProgramData] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Program detail modal
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [enrolling, setEnrolling] = useState(false);

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    try {
      const [progRes, restRes, activeRes] = await Promise.all([
        api.get('/wellness-programs'),
        api.get('/restaurants?limit=10&sort=rating'),
        api.get('/v1/wellness-programs/active').catch(() => ({ data: { enrollment: null } })),
      ]);
      setPrograms(progRes.data.programs || []);
      setRestaurants(restRes.data.data || []);

      if (activeRes.data.enrollment) {
        setActiveProgram(activeRes.data);
        setActiveProgramData(activeRes.data.program);
      } else {
        setActiveProgram(null);
        setActiveProgramData(null);
      }
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
      const { data } = await api.get(`/restaurants/search${params}`);
      setRestaurants(data.data || []);
    } catch (e) { console.error(e); }
  };

  const openProgram = (p: any) => {
    setSelectedProgram(p);
    setShowProgramModal(true);
  };

  const enrollInProgram = async () => {
    if (!selectedProgram) return;
    setEnrolling(true);
    try {
      await api.post(`/v1/wellness-programs/${selectedProgram.id}/enroll`);
      setShowProgramModal(false);
      Alert.alert('Enrolled!', `You've enrolled in ${selectedProgram.name}. Start your journey today!`);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to enroll');
    }
    setEnrolling(false);
  };

  const checkIn = async () => {
    if (!activeProgram?.enrollment) return;
    setCheckingIn(true);
    try {
      const programId = activeProgram.enrollment.program_id;
      const currentDay = activeProgram.currentDay || 1;
      await api.post('/v1/wellness-programs/checkin', {
        program_id: programId,
        day_number: currentDay,
      });
      Alert.alert('Checked In!', `Day ${currentDay} complete! Keep it up!`);
      loadData();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Check-in failed';
      if (msg.includes('Already')) {
        Alert.alert('Already Done', "You've already checked in today!");
      } else {
        Alert.alert('Error', msg);
      }
    }
    setCheckingIn(false);
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
        {/* Greeting */}
        <View style={s.greetRow}>
          <View>
            <Text style={s.greeting}>{greeting}, {firstName}!</Text>
            <Text style={s.greetSub}>Let us find your healthiest meal today</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={s.avatar}>
            <Ionicons name="person" size={20} color={Colors.green} />
          </TouchableOpacity>
        </View>

        {/* Active Program Widget */}
        {activeProgram && activeProgramData && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <View style={[s.activeProgramCard, Shadow.sm]}>
              <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.activeProgramGrad}>
                <View style={s.activeProgramHeader}>
                  <View>
                    <Text style={s.activeProgramLabel}>Active Program</Text>
                    <Text style={s.activeProgramName}>{activeProgramData.name || activeProgram.enrollment.program_name}</Text>
                  </View>
                  <View style={s.activeProgramDayBadge}>
                    <Text style={s.activeProgramDayText}>Day {activeProgram.currentDay}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={s.activeProgramProgress}>
                  <View style={s.activeProgramBarOuter}>
                    <View style={[s.activeProgramBarInner, {
                      width: `${Math.min(100, (activeProgram.completedDays / (activeProgram.enrollment?.duration_days || 7)) * 100)}%` as any
                    }]} />
                  </View>
                  <Text style={s.activeProgramPercent}>
                    {activeProgram.completedDays}/{activeProgram.enrollment?.duration_days || 7} days
                  </Text>
                </View>

                {/* Check-in button */}
                <TouchableOpacity
                  onPress={checkIn}
                  style={[s.checkinBtn, activeProgram.todayCheckedIn && s.checkinBtnDone]}
                  activeOpacity={0.8}
                  disabled={checkingIn || activeProgram.todayCheckedIn}
                >
                  {checkingIn ? (
                    <ActivityIndicator size="small" color={Colors.green} />
                  ) : (
                    <>
                      <Ionicons
                        name={activeProgram.todayCheckedIn ? "checkmark-circle" : "radio-button-off"}
                        size={20}
                        color={activeProgram.todayCheckedIn ? Colors.green : Colors.green}
                      />
                      <Text style={[s.checkinText, activeProgram.todayCheckedIn && s.checkinTextDone]}>
                        {activeProgram.todayCheckedIn ? "Today's check-in complete!" : "Check in for today"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* Wellness Programs */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Wellness Programs</Text>
            <TouchableOpacity><Text style={s.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.progScroll}>
            {programs.map((p, i) => (
              <TouchableOpacity key={p.id || i} style={s.progCard} activeOpacity={0.85} onPress={() => openProgram(p)}>
                <Image source={{ uri: p.image_url }} style={s.progImg} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.progOverlay}>
                  <View style={s.durationBadge}>
                    <Text style={s.durationText}>{p.duration_days} Days</Text>
                  </View>
                  <Text style={s.progTitle}>{p.name}</Text>
                  <Text style={s.progDesc} numberOfLines={1}>{p.description}</Text>
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
            <Animated.View entering={FadeInDown.duration(300)}>
              <View style={s.quickAddGrid}>
                {QUICK_ADDS.map((qa, i) => (
                  <TouchableOpacity key={i} style={s.qaItem} activeOpacity={0.7} onPress={() => router.push('/(tabs)/quick-adds')}>
                    <View style={[s.qaIcon, { backgroundColor: qa.color + '15' }]}>
                      <Ionicons name={qa.icon as any} size={22} color={qa.color} />
                    </View>
                    <Text style={s.qaLabel}>{qa.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
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
                    <Ionicons name="people-outline" size={12} color="#FFF" />
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

      {/* Program Detail Modal */}
      <Modal visible={showProgramModal} animationType="fade" transparent onRequestClose={() => setShowProgramModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowProgramModal(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={SlideInDown.springify().damping(18)} style={s.programModalSheet}>
                <View style={s.modalHandle} />
                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                  {selectedProgram && (
                    <>
                      <Image source={{ uri: selectedProgram.image_url }} style={s.programModalImg} />
                      <View style={s.programModalBody}>
                        <View style={s.programModalBadge}>
                          <Ionicons name="time-outline" size={14} color={Colors.green} />
                          <Text style={s.programModalBadgeText}>{selectedProgram.duration_days} Days Program</Text>
                        </View>
                        <Text style={s.programModalTitle}>{selectedProgram.name}</Text>
                        <Text style={s.programModalDesc}>{selectedProgram.description}</Text>

                        {/* What's included */}
                        <Text style={s.programModalSection}>What's Included</Text>
                        <View style={s.programFeatureList}>
                          {['Daily guided activities', 'Progress tracking', 'Check-in reminders', 'Completion certificate'].map((f, i) => (
                            <View key={i} style={s.programFeature}>
                              <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                              <Text style={s.programFeatureText}>{f}</Text>
                            </View>
                          ))}
                        </View>

                        {/* Enroll button */}
                        <TouchableOpacity
                          onPress={enrollInProgram}
                          style={s.enrollBtn}
                          activeOpacity={0.8}
                          disabled={enrolling}
                        >
                          {enrolling ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name="rocket" size={20} color="#FFF" />
                              <Text style={s.enrollBtnText}>Start Program</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowProgramModal(false)} style={s.cancelBtn}>
                          <Text style={s.cancelBtnText}>Maybe Later</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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

  // Active Program Widget
  activeProgramCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  activeProgramGrad: { padding: 16 },
  activeProgramHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  activeProgramLabel: { fontSize: FontSize.caption, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  activeProgramName: { fontSize: FontSize.h4, fontWeight: '800', color: '#FFF', marginTop: 2 },
  activeProgramDayBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  activeProgramDayText: { color: '#FFF', fontSize: FontSize.small, fontWeight: '700' },
  activeProgramProgress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  activeProgramBarOuter: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  activeProgramBarInner: { height: '100%', backgroundColor: '#FFF', borderRadius: 4 },
  activeProgramPercent: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.caption, fontWeight: '600' },
  checkinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: Radius.lg, paddingVertical: 12, marginTop: 14 },
  checkinBtnDone: { backgroundColor: 'rgba(255,255,255,0.9)' },
  checkinText: { color: Colors.green, fontWeight: '700', fontSize: FontSize.small },
  checkinTextDone: { color: Colors.green },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: FontSize.small, color: Colors.green, fontWeight: '600' },

  progScroll: { paddingLeft: Spacing.lg, gap: 12, paddingRight: 16 },
  progCard: { width: 280, height: 170, borderRadius: Radius.lg, overflow: 'hidden' },
  progImg: { width: '100%', height: '100%' },
  progOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', justifyContent: 'flex-end', padding: 16 },
  durationBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  durationText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  progTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  progDesc: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.caption, marginTop: 2 },

  quickAddBtn: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
  quickAddGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  quickAddText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
  quickAddGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, marginTop: Spacing.sm, gap: Spacing.sm },
  qaItem: { width: '30%' as any, alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderLight },
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

  // Program Detail Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  programModalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  programModalImg: { width: '100%', height: 200, marginTop: 8 },
  programModalBody: { padding: Spacing.lg },
  programModalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.greenLight, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 10 },
  programModalBadgeText: { fontSize: FontSize.small, color: Colors.green, fontWeight: '600' },
  programModalTitle: { fontSize: FontSize.h2, fontWeight: '800', color: Colors.textPrimary },
  programModalDesc: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 22, marginTop: 10 },
  programModalSection: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  programFeatureList: { gap: 10 },
  programFeature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  programFeatureText: { fontSize: FontSize.body, color: Colors.textSecondary },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 16, marginTop: Spacing.lg },
  enrollBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { color: Colors.textTertiary, fontSize: FontSize.body },
});
