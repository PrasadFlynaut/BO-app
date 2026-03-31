import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const MEAL_SLOTS = [
  { slot: 'Breakfast', icon: 'sunny-outline' as const, time: '7:00 - 9:00 AM', gradient: ['#FFB74D', '#FF9800'] as [string, string] },
  { slot: 'Lunch', icon: 'restaurant-outline' as const, time: '12:00 - 2:00 PM', gradient: ['#26B50F', '#1E8F0C'] as [string, string] },
  { slot: 'Dinner', icon: 'moon-outline' as const, time: '6:00 - 8:00 PM', gradient: ['#3A86FF', '#1A56CC'] as [string, string] },
];

export default function CulinaryBlueprintScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const userPrefs = user?.meal_preferences || user?.dietary_preferences || [];

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, featRes] = await Promise.all([
        api.get('/meal-categories'),
        api.get('/meal-featured'),
      ]);
      setCategories(catRes.data.categories || []);
      setFeatured(featRes.data.meal || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const isPreferred = (name: string) => userPrefs.some((p: string) => p.toLowerCase() === name.toLowerCase());

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Culinary Blueprint</Text>
          <Text style={s.subtitle}>Browse to select your preferred meal plan</Text>
        </View>

        {/* Category Grid */}
        {loading ? (
          <View style={s.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
        ) : (
          <Animated.View entering={FadeInDown.duration(500)} style={s.grid}>
            {categories.map((cat, i) => {
              const preferred = isPreferred(cat.name);
              return (
                <TouchableOpacity key={cat.id || i} style={[s.catCard, preferred && s.catPreferred]} activeOpacity={0.8}>
                  <Image source={{ uri: cat.image_url }} style={s.catImg} />
                  {preferred && (
                    <View style={s.catCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                    </View>
                  )}
                  <Text style={s.catName}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Plan Your Meal */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Plan Your Meal</Text>
          </View>
          {MEAL_SLOTS.map((m, i) => (
            <TouchableOpacity key={m.slot} style={[s.mealSlot, Shadow.sm]} activeOpacity={0.8}>
              <LinearGradient colors={m.gradient} style={s.mealSlotIcon}>
                <Ionicons name={m.icon} size={22} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.mealSlotName}>{m.slot}</Text>
                <Text style={s.mealSlotTime}>{m.time}</Text>
                <Text style={s.mealSlotEmpty}>No meal planned yet. Tap + to add.</Text>
              </View>
              <TouchableOpacity style={s.mealSlotAdd}>
                <Ionicons name="add" size={20} color={Colors.green} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Meal of the Moment */}
        {featured && (
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Meal of the Moment</Text>
            </View>
            <TouchableOpacity style={[s.featuredCard, Shadow.md]} activeOpacity={0.85}>
              <Image source={{ uri: featured.image_url }} style={s.featuredImg} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={s.featuredOverlay}>
                <Text style={s.featuredTitle}>{featured.title}</Text>
                <Text style={s.featuredSub}>{featured.about || featured.description}</Text>
                <View style={s.featuredBtn}>
                  <Text style={s.featuredBtnText}>View Recipe</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  content: { paddingBottom: 120 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 4 },
  loadWrap: { paddingVertical: 60, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: Spacing.md },
  catCard: { width: '29%' as any, alignItems: 'center', borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.bgBase, borderWidth: 1.5, borderColor: Colors.borderLight },
  catPreferred: { borderColor: Colors.green, borderWidth: 2 },
  catImg: { width: '100%', aspectRatio: 1, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  catCheck: { position: 'absolute', top: 6, right: 6 },
  catName: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', paddingVertical: 8 },
  sectionHead: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  mealSlot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.borderLight },
  mealSlotIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  mealSlotName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  mealSlotTime: { fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 2 },
  mealSlotEmpty: { fontSize: FontSize.caption, color: Colors.textTertiary, fontStyle: 'italic', marginTop: 4 },
  mealSlotAdd: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  featuredCard: { marginHorizontal: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  featuredImg: { width: '100%', height: 200 },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', justifyContent: 'flex-end', padding: 16 },
  featuredTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  featuredSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.small, marginTop: 4 },
  featuredBtn: { alignSelf: 'flex-start', backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 16, marginTop: 10 },
  featuredBtnText: { color: '#FFF', fontSize: FontSize.small, fontWeight: '700' },
});
