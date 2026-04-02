import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

const boLogo = require('../assets/images/bo-logo-color.png');

// Fallback image component
const FallbackImage = ({ uri, style }: { uri?: string; style: any }) => {
  const [failed, setFailed] = React.useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, { backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 36, fontWeight: '900', color: '#B0B0B0', letterSpacing: 3 }}>BO</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={style} contentFit="cover" transition={200} onError={() => setFailed(true)} />;
};

type Recipe = {
  id: string; title: string; category: string; calories: number;
  protein?: number; carbs?: number; fat?: number;
  servings?: number; prep_time?: number; cook_time?: number;
  image_url?: string; ingredients?: string[]; directions?: string[];
  notes?: string; created_at?: string;
};

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipe();
  }, []);

  const loadRecipe = async () => {
    try {
      const { data } = await api.get(`/v1/receipes/${id}`);
      setRecipe(data.recipe || data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    </SafeAreaView>
  );

  if (!recipe) return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Recipe</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="restaurant-outline" size={40} color="#D1D5DB" />
        <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Recipe not found</Text>
      </View>
    </SafeAreaView>
  );

  const macros = [
    { label: 'Calories', value: recipe.calories, unit: 'kcal', color: Colors.nutritionOrange },
    { label: 'Protein', value: recipe.protein || 0, unit: 'g', color: Colors.green },
    { label: 'Carbs', value: recipe.carbs || 0, unit: 'g', color: Colors.waterBlue },
    { label: 'Fat', value: recipe.fat || 0, unit: 'g', color: Colors.fitnessPurple },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Image source={boLogo} style={s.headerLogo} contentFit="contain" transition={200} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        {recipe.image_url ? (
          <FallbackImage uri={recipe.image_url} style={s.heroImg} />
        ) : (
          <View style={s.heroPlaceholder}>
            <Ionicons name="restaurant" size={48} color={Colors.green} />
          </View>
        )}

        <View style={s.body}>
          {/* Title */}
          <Animated.View entering={FadeInDown.duration(350)}>
            <Text style={s.title}>{recipe.title}</Text>
            <View style={s.metaRow}>
              <View style={s.catBadge}>
                <Text style={s.catText}>{recipe.category}</Text>
              </View>
              {recipe.servings ? (
                <View style={s.metaItem}>
                  <Ionicons name="people-outline" size={14} color={Colors.textTertiary} />
                  <Text style={s.metaText}>{recipe.servings} servings</Text>
                </View>
              ) : null}
              {recipe.prep_time ? (
                <View style={s.metaItem}>
                  <Ionicons name="timer-outline" size={14} color={Colors.textTertiary} />
                  <Text style={s.metaText}>{recipe.prep_time} min prep</Text>
                </View>
              ) : null}
              {recipe.cook_time ? (
                <View style={s.metaItem}>
                  <Ionicons name="flame-outline" size={14} color={Colors.textTertiary} />
                  <Text style={s.metaText}>{recipe.cook_time} min cook</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {/* Macros */}
          <Animated.View entering={FadeInDown.delay(80).duration(350)} style={s.macroRow}>
            {macros.map((m, i) => (
              <View key={i} style={s.macroCard}>
                <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
                <Text style={s.macroUnit}>{m.unit}</Text>
                <Text style={s.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <Animated.View entering={FadeInDown.delay(160).duration(350)} style={[s.section, Shadow.sm]}>
              <Text style={s.sectionTitle}>Ingredients</Text>
              {recipe.ingredients.map((ing, i) => (
                <View key={i} style={s.ingredientRow}>
                  <View style={s.bullet} />
                  <Text style={s.ingredientText}>{ing}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Directions */}
          {recipe.directions && recipe.directions.length > 0 && (
            <Animated.View entering={FadeInDown.delay(240).duration(350)} style={[s.section, Shadow.sm]}>
              <Text style={s.sectionTitle}>Directions</Text>
              {recipe.directions.map((step, i) => (
                <View key={i} style={s.stepRow}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Notes */}
          {recipe.notes ? (
            <Animated.View entering={FadeInDown.delay(320).duration(350)} style={s.notesCard}>
              <Ionicons name="document-text-outline" size={16} color={Colors.textTertiary} />
              <Text style={s.notesText}>{recipe.notes}</Text>
            </Animated.View>
          ) : null}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerLogo: { width: 36, height: 36 },
  heroImg: { width: '100%', height: 220 },
  heroPlaceholder: { width: '100%', height: 160, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  body: { padding: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  catBadge: { backgroundColor: Colors.greenLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  catText: { fontSize: FontSize.caption, fontWeight: '600', color: Colors.green },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSize.caption, color: Colors.textTertiary },
  macroRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  macroCard: { flex: 1, backgroundColor: '#F7F8FA', borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: '800' },
  macroUnit: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  macroLabel: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600', marginTop: 4 },
  section: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green, marginTop: 6 },
  ingredientText: { flex: 1, fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 22 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  stepText: { flex: 1, fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 22 },
  notesCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFBEB', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: '#F59E0B30' },
  notesText: { flex: 1, fontSize: FontSize.small, color: '#92400E', lineHeight: 20 },
});
