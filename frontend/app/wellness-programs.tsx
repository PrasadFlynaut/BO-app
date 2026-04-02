import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';
import ProgramModal from '@/src/components/ProgramModal';

// Fallback image component
const boLogoGrey = require('../assets/images/bo-logo-color.png');
const FallbackImage = ({ uri, style }: { uri?: string; style: any }) => {
  const [failed, setFailed] = React.useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
        <Image source={boLogoGrey} style={{ width: '50%', height: '50%', opacity: 0.18 }} contentFit="contain" />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} contentFit="cover" transition={200} onError={() => setFailed(true)} />;
};

export default function WellnessPrograms() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      const res = await api.get('/wellness-programs');
      setPrograms(res.data.programs || []);
    } catch (e) {
      console.error('Failed to load programs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPrograms();
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
      loadPrograms();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to enroll');
    }
    setEnrolling(false);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wellness Programs</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleRow}>
        <Ionicons name="leaf" size={18} color={Colors.green} />
        <Text style={styles.subtitle}>
          {programs.length} program{programs.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />
        }
      >
        {programs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Programs Available</Text>
            <Text style={styles.emptyDesc}>Check back soon for new wellness programs!</Text>
          </View>
        ) : (
          programs.map((p, i) => (
            <Animated.View key={p.id || i} entering={FadeInDown.delay(i * 80).duration(400)}>
              <TouchableOpacity
                style={[styles.card, Shadow.md]}
                activeOpacity={0.85}
                onPress={() => openProgram(p)}
              >
                <FallbackImage uri={p.image_url} style={styles.cardImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={12} color="#FFF" />
                    <Text style={styles.durationText}>{p.duration_days} Days</Text>
                  </View>
                </LinearGradient>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.featureChip}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
                      <Text style={styles.featureChipText}>Daily Activities</Text>
                    </View>
                    <View style={styles.featureChip}>
                      <Ionicons name="bar-chart" size={14} color={Colors.green} />
                      <Text style={styles.featureChipText}>Progress Tracking</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.enrollButton}
                    activeOpacity={0.8}
                    onPress={() => openProgram(p)}
                  >
                    <Ionicons name="rocket" size={16} color="#FFF" />
                    <Text style={styles.enrollButtonText}>View Program</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <ProgramModal
        visible={showProgramModal}
        program={selectedProgram}
        enrolling={enrolling}
        onClose={() => setShowProgramModal(false)}
        onEnroll={enrollInProgram}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.h3,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: FontSize.h4,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: FontSize.body,
    color: Colors.textTertiary,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: Spacing.sm,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.green,
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  durationText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: '#FFF',
  },
  cardBody: {
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.h4,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: FontSize.small,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  featureChipText: {
    fontSize: FontSize.caption,
    color: Colors.green,
    fontWeight: '600',
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.green,
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  enrollButtonText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#FFF',
  },
});
