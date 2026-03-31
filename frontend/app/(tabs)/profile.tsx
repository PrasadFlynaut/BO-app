import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    refreshUser();
    loadDashboard();
  }, []));

  const loadDashboard = async () => {
    try { const { data } = await api.get('/dashboard'); setDashboard(data); } catch (e) { console.error(e); }
  };

  const onRefresh = async () => { setRefreshing(true); await refreshUser(); await loadDashboard(); setRefreshing(false); };

  const goals = user?.goals || [];
  const diets = user?.dietary_preferences || [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{user?.name?.[0] || 'U'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.subscriptionBadge}>
            <Ionicons name={user?.subscription === 'pro' ? 'diamond' : 'person'} size={14} color={user?.subscription === 'pro' ? Colors.secondary : Colors.textMuted} />
            <Text style={[styles.subscriptionText, user?.subscription === 'pro' && { color: Colors.secondary }]}>
              {user?.subscription === 'pro' ? 'BO Pro' : 'Free Plan'}
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{dashboard?.meals_logged || 0}</Text>
            <Text style={styles.statSub}>Meals Today</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{Math.round(dashboard?.calories || 0)}</Text>
            <Text style={styles.statSub}>Calories</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{dashboard?.water_ml || 0}</Text>
            <Text style={styles.statSub}>Water (ml)</Text>
          </View>
        </View>

        {/* Goals */}
        {goals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Goals</Text>
            <View style={styles.chipRow}>
              {goals.map((g: string) => (
                <View key={g} style={styles.goalChip}>
                  <Text style={styles.goalChipText}>{g.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Dietary Preferences */}
        {diets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dietary Preferences</Text>
            <View style={styles.chipRow}>
              {diets.map((d: string) => (
                <View key={d} style={styles.dietChip}>
                  <Text style={styles.dietChipText}>{d.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Body Stats */}
        {user?.weight_kg && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body Stats</Text>
            <View style={styles.bodyStatsGrid}>
              {user.height_cm && (
                <View style={styles.bodyStatItem}>
                  <Ionicons name="resize-outline" size={20} color={Colors.textMuted} />
                  <Text style={styles.bodyStatValue}>{user.height_cm} cm</Text>
                  <Text style={styles.bodyStatLabel}>Height</Text>
                </View>
              )}
              <View style={styles.bodyStatItem}>
                <Ionicons name="scale-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.bodyStatValue}>{user.weight_kg} kg</Text>
                <Text style={styles.bodyStatLabel}>Weight</Text>
              </View>
              {user.target_weight_kg && (
                <View style={styles.bodyStatItem}>
                  <Ionicons name="flag-outline" size={20} color={Colors.primary} />
                  <Text style={[styles.bodyStatValue, { color: Colors.primary }]}>{user.target_weight_kg} kg</Text>
                  <Text style={styles.bodyStatLabel}>Target</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Settings Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {[
            { icon: 'notifications-outline', label: 'Notifications', color: Colors.secondary },
            { icon: 'people-outline', label: 'Invite Friends', color: Colors.primary },
            { icon: 'help-circle-outline', label: 'Help & Support', color: '#4FC3F7' },
            { icon: 'card-outline', label: 'Subscription', color: '#FFD93D' },
            { icon: 'shield-checkmark-outline', label: 'Privacy Policy', color: Colors.textMuted },
            { icon: 'information-circle-outline', label: 'About BO', color: Colors.textMuted },
          ].map((item, i) => (
            <TouchableOpacity key={i} testID={`settings-${item.label.replace(/\s/g, '-').toLowerCase()}`} style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Upgrade Banner */}
        {user?.subscription !== 'pro' && (
          <TouchableOpacity testID="upgrade-banner" style={styles.upgradeBanner} activeOpacity={0.8}>
            <Ionicons name="diamond" size={24} color="#000" />
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>Upgrade to BO Pro</Text>
              <Text style={styles.upgradeSub}>Unlimited plans, AI coaching & more</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity testID="logout-button" style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarLargeText: { color: '#000', fontSize: 32, fontWeight: '700' },
  profileName: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '700' },
  profileEmail: { color: Colors.textSecondary, fontSize: FontSize.body, marginTop: 2 },
  subscriptionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm, backgroundColor: Colors.bgSurface, paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  subscriptionText: { color: Colors.textMuted, fontSize: FontSize.small, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statBox: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statNum: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '700' },
  statSub: { color: Colors.textMuted, fontSize: FontSize.small, marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  goalChip: { backgroundColor: 'rgba(219,255,2,0.1)', borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: 'rgba(219,255,2,0.3)' },
  goalChipText: { color: Colors.secondary, fontSize: FontSize.caption, fontWeight: '600', textTransform: 'capitalize' },
  dietChip: { backgroundColor: 'rgba(38,181,15,0.1)', borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: 'rgba(38,181,15,0.3)' },
  dietChipText: { color: Colors.primary, fontSize: FontSize.caption, fontWeight: '600', textTransform: 'capitalize' },
  bodyStatsGrid: { flexDirection: 'row', gap: Spacing.sm },
  bodyStatItem: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  bodyStatValue: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '700', marginTop: Spacing.xs },
  bodyStatLabel: { color: Colors.textMuted, fontSize: FontSize.small, marginTop: 2 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuLabel: { color: Colors.textPrimary, fontSize: FontSize.body },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.secondary, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  upgradeTitle: { color: '#000', fontSize: FontSize.body, fontWeight: '700' },
  upgradeSub: { color: 'rgba(0,0,0,0.6)', fontSize: FontSize.caption },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  logoutText: { color: Colors.danger, fontSize: FontSize.body, fontWeight: '600' },
});
