import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
  Dimensions, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';
import { boLogoColor, boLogoWhite } from '@/src/assets';
import HappinessModal from '@/src/components/HappinessModal';
import SidebarPanel from '@/src/components/SidebarPanel';
import ProgramModal from '@/src/components/ProgramModal';
import FallbackImage from '@/src/components/FallbackImage';
import SearchBar from '@/src/components/SearchBar';

const { width: SCREEN_W } = Dimensions.get('window');

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
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Happiness check-in
  const [showHappiness, setShowHappiness] = useState(false);
  const [happinessLogged, setHappinessLogged] = useState(false);

  // Daily Quote
  const [dailyQuote, setDailyQuote] = useState<{ text: string; subQuote: string } | null>(null);

  // Sidebar drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Geolocation (US-BO-001)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [locationName, setLocationName] = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Request location permission once and persist decision
  useEffect(() => {
    const requestLocation = async () => {
      try {
        const stored = await AsyncStorage.getItem('bo_location_permission');
        if (stored === 'denied') { setLocationDenied(true); setMapLoading(false); return; }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationDenied(true);
          await AsyncStorage.setItem('bo_location_permission', 'denied');
          setMapLoading(false);
          return;
        }
        await AsyncStorage.setItem('bo_location_permission', 'granted');
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        // Reverse geocode to get city, state, country
        try {
          const geocode = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geocode && geocode.length > 0) {
            const g = geocode[0];
            const parts = [
              g.name !== g.street ? g.name : null, // name is often the house number/POI
              g.street,
              g.district, // area/neighborhood
              g.city,
              g.postalCode
            ].filter(Boolean);
            setLocationName(parts.length > 0 ? parts.join(', ') : 'Location unavailable');
          } else {
            setLocationName('Location unavailable');
          }
        } catch {
          setLocationName('Location unavailable');
        }
      } catch {
        setLocationDenied(true);
      }
      setMapLoading(false);
    };
    requestLocation();
  }, []);

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
      // Load unread notifications count
      try {
        const { data: notifData } = await api.get('/v1/notifications?page=1&limit=1');
        setUnreadNotifs(notifData.unreadCount || 0);
      } catch {}
      // Check if happiness logged today - auto-show modal if not
      try {
        const { data: hData } = await api.get('/v1/happiness/today');
        if (!hData.logged && !happinessLogged) {
          setTimeout(() => setShowHappiness(true), 1500);
        } else {
          setHappinessLogged(true);
        }
      } catch {}
      // Load daily quote
      try {
        const { data: qData } = await api.get('/v1/quotes/today');
        if (qData.quote) {
          setDailyQuote({ text: qData.quote.text, subQuote: qData.quote.subQuote || '' });
        }
      } catch {}
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const fetchRestaurants = async (filter: string, query: string) => {
    setLoading(true);
    try {
      let url: string;
      if (filter === 'Nearby') {
        if (!userLocation) { setRestaurants([]); setLoading(false); return; }
        const p = new URLSearchParams({
          lat: String(userLocation.latitude),
          lng: String(userLocation.longitude),
          limit: '10',
        });
        if (query.trim()) p.set('q', query.trim());
        url = `/restaurants/nearby?${p.toString()}`;
      } else if (filter === 'Top Rated') {
        const p = new URLSearchParams({ min_rating: '4', sort: 'rating' });
        if (query.trim()) p.set('q', query.trim());
        url = `/restaurants/search?${p.toString()}`;
      } else if (filter === 'BO Verified') {
        const p = new URLSearchParams({ bo_verified: 'true' });
        if (query.trim()) p.set('q', query.trim());
        url = `/restaurants/search?${p.toString()}`;
      } else if (filter === 'BO Partner') {
        const p = new URLSearchParams({ bo_partner: 'true' });
        if (query.trim()) p.set('q', query.trim());
        url = `/restaurants/search?${p.toString()}`;
      } else if (query.trim()) {
        url = `/restaurants/search?q=${encodeURIComponent(query.trim())}`;
      } else {
        url = '/restaurants?limit=10&sort=rating';
      }
      const { data } = await api.get(url);
      setRestaurants(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchRestaurants(activeFilter, q), 400);
  };

  const handleFilter = (filter: string) => {
    setActiveFilter(filter);
    fetchRestaurants(filter, search);
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
    { icon: 'sunny-outline', label: 'Breakfast', color: '#FFB74D', zone: 'meals', slot: 'breakfast' },
    { icon: 'restaurant-outline', label: 'Lunch', color: Colors.green, zone: 'meals', slot: 'lunch' },
    { icon: 'moon-outline', label: 'Dinner', color: Colors.waterBlue, zone: 'meals', slot: 'dinner' },
    { icon: 'cafe-outline', label: 'Snack', color: Colors.fitnessPurple, zone: 'meals', slot: 'snack' },
    { icon: 'water-outline', label: 'Water', color: Colors.waterBlue, zone: 'trackers', slot: 'water' },
    { icon: 'barbell-outline', label: 'Exercise', color: Colors.nutritionOrange, zone: 'workouts', slot: '' },
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
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
            <Image source={boLogoColor} style={s.headerLogo} contentFit="contain" transition={200} />
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>{greeting}, {firstName}!</Text>
              <Text style={s.greetSub}>Let us find your healthiest meal today</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={s.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
              {unreadNotifs > 0 && (
                <View style={s.notifBadge}>
                  <Text style={s.notifBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={s.avatar}>
              <Ionicons name="person" size={20} color={Colors.green} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quote of the Day */}
        {dailyQuote && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <View style={s.quoteCard}>
              <View style={s.quoteIconWrap}>
                <Ionicons name="sparkles" size={18} color={Colors.green} />
              </View>
              <View style={s.quoteContent}>
                <Text style={s.quoteText}>"{dailyQuote.text}"</Text>
                {dailyQuote.subQuote ? (
                  <Text style={s.subQuoteText}>{dailyQuote.subQuote}</Text>
                ) : null}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ===== SECTION 2: Culinary Blueprint (Geolocation Map) ===== */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Culinary Blueprint</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/menu')}><Text style={s.seeAll}>Meal Planter</Text></TouchableOpacity>
          </View>

          {/* Location status + search */}
          {locationDenied ? (
            <View style={[s.locationFallbackCard, Shadow.sm]}>
              <Ionicons name="location-outline" size={32} color={Colors.textTertiary} />
              <Text style={s.locationFallbackTitle}>Your location is unavailable</Text>
              <Text style={s.locationFallbackText}>Update your settings to enable the map.</Text>
            </View>
          ) : mapLoading ? (
            <View style={s.skeletonCard}>
              <View style={s.skeletonBar} />
              <View style={[s.skeletonBar, { width: '60%' }]} />
              <View style={[s.skeletonBar, { width: '80%', height: 80 }]} />
            </View>
          ) : (
            <>
              <View style={s.locationRow}>
                <Ionicons name="location" size={16} color={Colors.green} />
                <Text style={[s.locationText, { flex: 1 }]} numberOfLines={1}>
                  {locationName || 'Location unavailable'}
                </Text>
                <TouchableOpacity
                  style={s.mapIconBtn}
                  onPress={() => router.push({ pathname: '/restaurant-map', params: { lat: userLocation?.latitude ?? 0, lng: userLocation?.longitude ?? 0 } } as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={17} color={Colors.green} />
                </TouchableOpacity>
              </View>
              <Text style={s.findTitle}>Find your healthiest meal today</Text>
            </>
          )}

          <SearchBar
            value={search}
            onChangeText={handleSearch}
            placeholder="Search restaurants, cuisines..."
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f} style={[s.filterChip, activeFilter === f && s.filterActive]} onPress={() => handleFilter(f)} activeOpacity={0.7} accessibilityLabel={`Filter: ${f}`}>
                <Text style={[s.filterText, activeFilter === f && s.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Restaurant List */}
          {loading ? (
            <View style={s.loadingWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
          ) : restaurants.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
              <Text style={s.emptyText}>No nearby spots found for your Culinary Blueprint</Text>
              <Text style={s.emptySubtext}>Try expanding your preferences in settings.</Text>
            </View>
          ) : (
            restaurants.slice(0, 3).map((r, i) => (
              <Animated.View key={r.id || i} entering={FadeInDown.delay(200 + i * 60).duration(400)}>
                <TouchableOpacity style={[s.restCard, Shadow.sm]} onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })} activeOpacity={0.85}>
                  <FallbackImage uri={r.image_url} style={s.restImg} />
                  {r.bo_verified && (
                    <View style={s.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                      <Text style={s.verifiedText}>BO Verified</Text>
                    </View>
                  )}
                  <View style={s.restBody}>
                    <Text style={s.restName}>{r.name}</Text>
                    <Text style={s.restCuisine}>{(r.cuisines || []).join(', ')}</Text>
                    <View style={s.restMeta}>
                      <View style={s.ratingRow}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={s.ratingText}>{r.average_rating || '0.0'}</Text>
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
        </Animated.View>

        {/* ===== SECTION 3: Embrace Connection ===== */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: '#F5841F' }]}>Embrace Connection</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/feed')}><Text style={s.seeAll}>View All</Text></TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.connectionCard, Shadow.sm]}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/feed')}
            accessibilityLabel="Navigate to Embrace Connection social feed"
          >
            <LinearGradient colors={['#FFF7ED', '#FEF3C7']} style={s.connectionGrad}>
              <Ionicons name="people" size={28} color="#F5841F" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.connectionTitle}>Connect with your community</Text>
                <Text style={s.connectionSub}>Share your wellness journey, inspire others, and stay motivated together.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#F5841F" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ===== SECTION 4: Exercise ===== */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Exercise</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/quick-adds?zone=workouts' as any)}><Text style={s.seeAll}>Full Fitness</Text></TouchableOpacity>
          </View>
          <View style={s.exerciseRow}>
            <TouchableOpacity style={[s.exerciseCard, Shadow.sm]} activeOpacity={0.85} onPress={() => router.push('/(tabs)/quick-adds?zone=workouts' as any)} accessibilityLabel="View cardiac health summary">
              <LinearGradient colors={['#FEE2E2', '#FFF']} style={s.exerciseGrad}>
                <Ionicons name="heart" size={24} color="#EF4444" />
                <Text style={s.exerciseCardTitle}>Cardiac Health</Text>
                <Text style={s.exerciseCardSub}>Monitor your heart wellness and activity levels</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[s.exerciseCard, Shadow.sm]} activeOpacity={0.85} onPress={() => router.push('/(tabs)/quick-adds?zone=workouts' as any)} accessibilityLabel="Navigate to fitness area">
              <LinearGradient colors={['#EDE9FE', '#FFF']} style={s.exerciseGrad}>
                <Ionicons name="barbell" size={24} color={Colors.fitnessPurple} />
                <Text style={s.exerciseCardTitle}>Fitness</Text>
                <Text style={s.exerciseCardSub}>Log workouts, track progress, and stay active</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Active Program Widget */}
        {activeProgram && activeProgramData && (
          <Animated.View entering={FadeInDown.delay(50).duration(350)}>
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
            <TouchableOpacity onPress={() => router.push('/wellness-programs')}><Text style={s.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.progScroll}>
            {programs.map((p, i) => (
              <TouchableOpacity key={p.id || i} style={s.progCard} activeOpacity={0.85} onPress={() => openProgram(p)}>
                <FallbackImage uri={p.image_url} style={s.progImg} />
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
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
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
                  <TouchableOpacity key={i} style={s.qaItem} activeOpacity={0.7} onPress={() => {
                    setShowQuickAdd(false);
                    router.push(`/(tabs)/quick-adds?zone=${qa.zone}&slot=${qa.slot}` as any);
                  }}>
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
      </ScrollView>

      {/* Program Detail Modal */}
      <ProgramModal
        visible={showProgramModal}
        program={selectedProgram}
        enrolling={enrolling}
        onClose={() => setShowProgramModal(false)}
        onEnroll={enrollInProgram}
      />

      {/* Happiness Check-in Modal */}
      <HappinessModal
        visible={showHappiness}
        onClose={() => { setShowHappiness(false); setHappinessLogged(true); }}
        onLogged={() => { setShowHappiness(false); setHappinessLogged(true); }}
      />

      <SidebarPanel isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  greetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 24 },
  headerLogo: { width: 42, height: 42, borderRadius: 10 },
  greeting: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  greetSub: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 4 },

  // Quote of the Day
  quoteCard: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.green + '10', borderRadius: Radius.lg, borderLeftWidth: 3, borderLeftColor: Colors.green },
  quoteIconWrap: { marginRight: Spacing.sm, marginTop: 2 },
  quoteContent: { flex: 1 },
  quoteText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textPrimary, fontStyle: 'italic', lineHeight: 22 },
  subQuoteText: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },

  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.green },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', position: 'relative' as const },
  notifBadge: { position: 'absolute' as const, top: -2, right: -2, backgroundColor: '#E53E3E', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  notifBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

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
  mapIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.green + '40' },
  findTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
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
  headerQuote: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  headerQuoteAuthor: { fontSize: FontSize.caption, color: Colors.textTertiary },

  // Geolocation fallback card
  locationFallbackCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: 24,
    borderRadius: Radius.lg, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: Colors.borderLight,
    alignItems: 'center', gap: 8,
  },
  locationFallbackTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  locationFallbackText: { fontSize: FontSize.small, color: Colors.textSecondary, textAlign: 'center' },

  // Skeleton loader
  skeletonCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: 20,
    borderRadius: Radius.lg, backgroundColor: '#F3F4F6', gap: 12,
  },
  skeletonBar: { width: '100%' as any, height: 16, borderRadius: 8, backgroundColor: '#E5E7EB' },

  // Embrace Connection
  connectionCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  connectionGrad: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  connectionTitle: { fontSize: FontSize.body, fontWeight: '700', color: '#92400E' },
  connectionSub: { fontSize: FontSize.small, color: '#B45309', marginTop: 4 },

  // Exercise section
  exerciseRow: { flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  exerciseCard: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#FFF' },
  exerciseGrad: { padding: 16, gap: 8, minHeight: 120 },
  exerciseCardTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  exerciseCardSub: { fontSize: FontSize.caption, color: Colors.textSecondary, lineHeight: 16 },
});
