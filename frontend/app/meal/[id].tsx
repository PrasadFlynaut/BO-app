import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  ActivityIndicator, Alert, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [meal, setMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('breakfast');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingToPlan, setAddingToPlan] = useState(false);

  useEffect(() => { if (id) loadMeal(); }, [id]);

  const loadMeal = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/v1/meals/${id}`);
      setMeal(data.meal);
      setFavorited(data.meal?.favorited || false);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggleFavorite = async () => {
    setFavorited(!favorited);
    try {
      await api.post(`/v1/meal/fav/${id}`);
    } catch (e) {
      setFavorited(!favorited);
    }
  };

  const addToMealPlan = async () => {
    setAddingToPlan(true);
    try {
      await api.post('/v1/meal-plan', { mealId: id, date: planDate, mealSlot: selectedSlot });
      setShowPlanModal(false);
      Alert.alert('Added!', `${meal?.title} added to ${selectedSlot} on ${planDate}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to add');
    }
    setAddingToPlan(false);
  };

  const getDateOptions = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        value: d.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }
    return dates;
  };

  if (loading) return (
    <SafeAreaView style={ms.safe}><View style={ms.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View></SafeAreaView>
  );
  if (!meal) return (
    <SafeAreaView style={ms.safe}><View style={ms.loadWrap}><Text>Meal not found</Text></View></SafeAreaView>
  );

  const macros = [
    { label: 'Calories', value: `${meal.calories || 0}`, unit: 'kcal', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
    { label: 'Protein', value: `${meal.proteins || 0}`, unit: 'g', color: Colors.green, bg: Colors.greenLight },
    { label: 'Fat', value: `${meal.fat || 0}`, unit: 'g', color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
    { label: 'Carbs', value: `${meal.carbs || 0}`, unit: 'g', color: Colors.waterBlue, bg: Colors.waterSurface },
  ];

  return (
    <SafeAreaView style={ms.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={ms.heroWrap}>
          <Image source={{ uri: meal.image_url }} style={ms.heroImg} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.5)']} style={ms.heroOverlay} />
          <View style={ms.heroNav}>
            <TouchableOpacity onPress={() => router.back()} style={ms.heroBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={ms.heroBtn}>
              <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? '#E53E3E' : '#FFF'} />
            </TouchableOpacity>
          </View>
          <View style={ms.heroBadges}>
            <View style={ms.heroBadge}><Ionicons name="time-outline" size={14} color="#FFF" /><Text style={ms.heroBadgeText}>{meal.servings || 1} servings</Text></View>
            <View style={ms.heroBadge}><Ionicons name="flame-outline" size={14} color="#FFF" /><Text style={ms.heroBadgeText}>{meal.calories} cal</Text></View>
          </View>
        </View>

        <View style={ms.body}>
          {/* Title & Category */}
          <Animated.View entering={FadeInDown.duration(350)}>
            <View style={ms.tagRow}>
              <View style={ms.tag}><Text style={ms.tagText}>{meal.category}</Text></View>
              <View style={[ms.tag, { backgroundColor: Colors.waterSurface }]}><Text style={[ms.tagText, { color: Colors.waterBlue }]}>{meal.meal_type}</Text></View>
            </View>
            <Text style={ms.mealTitle}>{meal.title}</Text>
            {meal.about && <Text style={ms.mealAbout}>{meal.about}</Text>}
          </Animated.View>

          {/* Macros Grid */}
          <Animated.View entering={FadeInDown.delay(100).duration(350)} style={ms.macrosGrid}>
            {macros.map((m, i) => (
              <View key={i} style={[ms.macroCard, { backgroundColor: m.bg }]}>
                <Text style={[ms.macroValue, { color: m.color }]}>{m.value}</Text>
                <Text style={ms.macroUnit}>{m.unit}</Text>
                <Text style={ms.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Description */}
          {meal.description && (
            <Animated.View entering={FadeInDown.delay(150).duration(350)} style={ms.section}>
              <Text style={ms.sectionTitle}>About</Text>
              <Text style={ms.descText}>{meal.description}</Text>
            </Animated.View>
          )}

          {/* Ingredients */}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(350)} style={ms.section}>
              <Text style={ms.sectionTitle}>Ingredients</Text>
              <View style={ms.ingredientList}>
                {meal.ingredients.map((ing: any, i: number) => (
                  <View key={i} style={ms.ingredientRow}>
                    <View style={ms.ingredientDot} />
                    <Text style={ms.ingredientName}>{ing.name}</Text>
                    <Text style={ms.ingredientQty}>{ing.quantity}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Directions */}
          {meal.directions && (
            <Animated.View entering={FadeInDown.delay(250).duration(350)} style={ms.section}>
              <Text style={ms.sectionTitle}>Directions</Text>
              {meal.directions.split('\n').filter((s: string) => s.trim()).map((step: string, i: number) => (
                <View key={i} style={ms.stepRow}>
                  <View style={ms.stepNum}><Text style={ms.stepNumText}>{i + 1}</Text></View>
                  <Text style={ms.stepText}>{step.replace(/^\d+\.\s*/, '')}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Notes */}
          {meal.notes ? (
            <Animated.View entering={FadeInDown.delay(300).duration(350)} style={ms.notesBox}>
              <Ionicons name="bulb-outline" size={18} color={Colors.nutritionOrange} />
              <Text style={ms.notesText}>{meal.notes}</Text>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[ms.bottomBar, Shadow.lg]}>
        <TouchableOpacity style={ms.favBtn} onPress={toggleFavorite} activeOpacity={0.7}>
          <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? '#E53E3E' : Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPlanModal(true)} activeOpacity={0.8}>
          <LinearGradient colors={[Colors.green, Colors.greenDark]} style={ms.addPlanBtn}>
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={ms.addPlanText}>Add to Meal Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Add to Plan Modal */}
      <Modal visible={showPlanModal} transparent animationType="slide">
        <View style={ms.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPlanModal(false)} />
          <View style={[ms.modalContent, Shadow.lg]}>
            <View style={ms.modalHandle} />
            <Text style={ms.modalTitle}>Add to Meal Plan</Text>
            <Text style={ms.modalMealName}>{meal.title}</Text>

            <Text style={ms.modalLabel}>Meal Slot</Text>
            <View style={ms.slotRow}>
              {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[ms.slotChip, selectedSlot === slot && ms.slotChipActive]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Ionicons
                    name={slot === 'breakfast' ? 'sunny-outline' : slot === 'lunch' ? 'restaurant-outline' : 'moon-outline'}
                    size={16}
                    color={selectedSlot === slot ? '#FFF' : Colors.textSecondary}
                  />
                  <Text style={[ms.slotChipText, selectedSlot === slot && ms.slotChipTextActive]}>
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={ms.modalLabel}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
              {getDateOptions().map(d => (
                <TouchableOpacity
                  key={d.value}
                  style={[ms.dateChip, planDate === d.value && ms.dateChipActive]}
                  onPress={() => setPlanDate(d.value)}
                >
                  <Text style={[ms.dateChipText, planDate === d.value && ms.dateChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity onPress={addToMealPlan} disabled={addingToPlan} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.green, Colors.greenDark]} style={ms.modalBtn}>
                {addingToPlan ? <ActivityIndicator color="#FFF" /> : <Text style={ms.modalBtnText}>Add to Plan</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { position: 'relative' },
  heroImg: { width: SCREEN_WIDTH, height: 280 },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroNav: { position: 'absolute', top: 8, left: Spacing.md, right: Spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  heroBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  heroBadges: { position: 'absolute', bottom: 12, left: Spacing.md, flexDirection: 'row', gap: Spacing.sm },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  heroBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  body: { padding: Spacing.lg },
  tagRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tag: { backgroundColor: Colors.greenLight, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 12 },
  tagText: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '700' },
  mealTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, lineHeight: 32 },
  mealAbout: { fontSize: FontSize.body, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 24 },
  macrosGrid: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  macroCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center' },
  macroValue: { fontSize: FontSize.h3, fontWeight: '800' },
  macroUnit: { fontSize: FontSize.caption, color: Colors.textTertiary },
  macroLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2, fontWeight: '600' },
  section: { marginTop: Spacing.xl },
  sectionTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  descText: { color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 24 },
  ingredientList: { gap: Spacing.sm },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  ingredientName: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.body },
  ingredientQty: { color: Colors.textSecondary, fontSize: FontSize.small, fontWeight: '600' },
  stepRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 24 },
  notesBox: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.nutritionSurface, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.lg },
  notesText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.small, lineHeight: 20 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FFF', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  favBtn: { width: 48, height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  addPlanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: 16 },
  addPlanText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  modalMealName: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: 4, marginBottom: Spacing.lg },
  modalLabel: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: Spacing.sm },
  slotRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  slotChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: '#FFF' },
  slotChipActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  slotChipText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  slotChipTextActive: { color: '#FFF' },
  dateChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.borderLight, marginRight: Spacing.sm, backgroundColor: '#FFF' },
  dateChipActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  dateChipText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  dateChipTextActive: { color: '#FFF' },
  modalBtn: { borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
