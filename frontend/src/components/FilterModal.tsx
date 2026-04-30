@ -0,0 +1,213 @@
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/src/theme';
import { LinearGradient } from 'expo-linear-gradient';

const CUISINES = ['Italian', 'Chinese', 'Indian', 'American', 'Mexican', 'Japanese', 'Healthy', 'Vegan', 'Keto', 'Mediterranean'];
const RATINGS = [3, 3.5, 4, 4.5];

type FilterState = {
  minRating: number | null;
  cuisines: string[];
  boVerified: boolean;
  boPartner: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
};

export default function FilterModal({ visible, onClose, onApply, initialFilters }: Props) {
  const [minRating, setMinRating] = useState<number | null>(initialFilters.minRating);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(initialFilters.cuisines);
  const [boVerified, setBoVerified] = useState(initialFilters.boVerified);
  const [boPartner, setBoPartner] = useState(initialFilters.boPartner);

  const toggleCuisine = (c: string) => {
    setSelectedCuisines(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const reset = () => {
    setMinRating(null);
    setSelectedCuisines([]);
    setBoVerified(false);
    setBoPartner(false);
  };

  const handleApply = () => {
    onApply({
      minRating,
      cuisines: selectedCuisines,
      boVerified,
      boPartner,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.overlay}>
        <Pressable style={s.dismiss} onPress={onClose} />
        <View style={[s.content, Shadow.lg]}>
          <View style={s.header}>
            <Text style={s.title}>Advanced Filters</Text>
            <TouchableOpacity onPress={reset} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.resetText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {/* BO Status */}
            <Text style={s.sectionTitle}>Verification Status</Text>
            <View style={s.statusRow}>
              <TouchableOpacity
                style={[s.statusChip, boVerified && s.statusChipActive]}
                onPress={() => setBoVerified(!boVerified)}
              >
                <Ionicons name={boVerified ? "shield-checkmark" : "shield-outline"} size={18} color={boVerified ? '#FFF' : Colors.textSecondary} />
                <Text style={[s.statusText, boVerified && s.statusTextActive]}>BO Verified</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.statusChip, boPartner && s.statusChipActive]}
                onPress={() => setBoPartner(!boPartner)}
              >
                <Ionicons name={boPartner ? "star" : "star-outline"} size={18} color={boPartner ? '#FFF' : Colors.textSecondary} />
                <Text style={[s.statusText, boPartner && s.statusTextActive]}>BO Partner</Text>
              </TouchableOpacity>
            </View>

            {/* Ratings */}
            <Text style={s.sectionTitle}>Minimum Rating</Text>
            <View style={s.ratingRow}>
              {RATINGS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.ratingChip, minRating === r && s.ratingChipActive]}
                  onPress={() => setMinRating(minRating === r ? null : r)}
                >
                  <Ionicons name="star" size={14} color={minRating === r ? '#FFF' : '#FFD700'} />
                  <Text style={[s.ratingText, minRating === r && s.ratingTextActive]}>{r}+</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cuisines */}
            <Text style={s.sectionTitle}>Cuisines</Text>
            <View style={s.cuisineGrid}>
              {CUISINES.map(c => {
                const isActive = selectedCuisines.includes(c);
                return (
                  <TouchableOpacity
                    key={c}
                    style={[s.cuisineChip, isActive && s.cuisineChipActive]}
                    onPress={() => toggleCuisine(c)}
                  >
                    <Text style={[s.cuisineText, isActive && s.cuisineTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity onPress={handleApply} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.applyBtn}>
                <Text style={s.applyBtnText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dismiss: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: {
    backgroundColor: Colors.bgBase,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  resetText: { fontSize: FontSize.small, color: Colors.danger, fontWeight: '600' },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  sectionTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.sm },
  
  statusRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bgBase,
  },
  statusChipActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  statusText: { fontSize: FontSize.small, color: Colors.textSecondary, fontWeight: '600' },
  statusTextActive: { color: '#FFF' },

  ratingRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  ratingChipActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  ratingText: { fontSize: FontSize.small, color: Colors.textPrimary, fontWeight: '700' },
  ratingTextActive: { color: '#FFF' },

  cuisineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cuisineChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cuisineChipActive: { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  cuisineText: { fontSize: FontSize.small, color: Colors.textSecondary, fontWeight: '500' },
  cuisineTextActive: { color: Colors.green, fontWeight: '700' },

  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: '#FFF',
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.md,
  },
  applyBtn: { borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  applyBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});