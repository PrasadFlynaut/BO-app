import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, TextInput, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const router = useRouter();

  useFocusEffect(useCallback(() => { refreshUser(); loadDashboard(); }, []));
  const loadDashboard = async () => { try { const { data } = await api.get('/dashboard'); setDashboard(data); } catch (e) { console.error(e); } };
  const onRefresh = async () => { setRefreshing(true); await refreshUser(); await loadDashboard(); setRefreshing(false); };

  const handleChangePw = async () => {
    setPwError(''); setPwSuccess('');
    if (!curPw || !newPw || !confirmPw) { setPwError('All fields required'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: curPw, new_password: newPw });
      setPwSuccess('Password changed successfully!');
      setCurPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setShowChangePw(false); setPwSuccess(''); }, 1500);
    } catch (e: any) {
      setPwError(e.response?.data?.detail || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  const onSettingPress = (label: string) => {
    if (label === 'Change Password') { setShowChangePw(true); setPwError(''); setPwSuccess(''); setCurPw(''); setNewPw(''); setConfirmPw(''); }
    else if (label === 'Privacy Policy') { router.push('/(auth)/privacy-policy'); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient colors={['#26B50F', '#1E8F0C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileHeader}>
            <View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{user?.name?.[0] || 'U'}</Text></View>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.subscriptionBadge}>
              <Ionicons name={user?.subscription === 'pro' ? 'diamond' : 'sparkles'} size={14} color={user?.subscription === 'pro' ? Colors.lime : '#FFF'} />
              <Text style={styles.subscriptionText}>{user?.subscription === 'pro' ? 'BO Pro' : 'Free Plan'}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.statsRow}>
          {[
            { num: dashboard?.meals_logged || 0, label: 'Meals', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
            { num: Math.round(dashboard?.calories || 0), label: 'Calories', color: Colors.green, bg: Colors.greenLight },
            { num: dashboard?.water_ml || 0, label: 'Water (ml)', color: Colors.waterBlue, bg: Colors.waterSurface },
          ].map((s, i) => (
            <View key={i} style={[styles.statBox, { backgroundColor: s.bg }, Shadow.sm]}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
              <Text style={styles.statSub}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Goals */}
        {(user?.goals || []).length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>My Goals</Text>
            <View style={styles.chipRow}>
              {(user?.goals || []).map((g: string) => (
                <LinearGradient key={g} colors={[Colors.lime + '30', Colors.greenLight]} style={styles.goalChip}>
                  <Text style={styles.goalChipText}>{g.replace(/_/g, ' ')}</Text>
                </LinearGradient>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Dietary Preferences */}
        {(user?.dietary_preferences || []).length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Diet Preferences</Text>
            <View style={styles.chipRow}>
              {(user?.dietary_preferences || []).map((d: string) => (
                <View key={d} style={styles.dietChip}><Text style={styles.dietChipText}>{d.replace(/_/g, ' ')}</Text></View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Body Stats */}
        {user?.weight_kg && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Body Stats</Text>
            <View style={styles.bodyGrid}>
              {user.height_cm && <View style={[styles.bodyItem, { backgroundColor: Colors.waterSurface }, Shadow.sm]}><Ionicons name="resize-outline" size={22} color={Colors.waterBlue} /><Text style={[styles.bodyVal, { color: Colors.waterBlue }]}>{user.height_cm} cm</Text><Text style={styles.bodyLbl}>Height</Text></View>}
              <View style={[styles.bodyItem, { backgroundColor: Colors.nutritionSurface }, Shadow.sm]}><Ionicons name="scale-outline" size={22} color={Colors.nutritionOrange} /><Text style={[styles.bodyVal, { color: Colors.nutritionOrange }]}>{user.weight_kg} kg</Text><Text style={styles.bodyLbl}>Weight</Text></View>
              {user.target_weight_kg && <View style={[styles.bodyItem, { backgroundColor: Colors.greenLight }, Shadow.sm]}><Ionicons name="flag-outline" size={22} color={Colors.green} /><Text style={[styles.bodyVal, { color: Colors.green }]}>{user.target_weight_kg} kg</Text><Text style={styles.bodyLbl}>Target</Text></View>}
            </View>
          </Animated.View>
        )}

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.settingsCard, Shadow.sm]}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {[
            { icon: 'lock-closed-outline', label: 'Change Password', color: '#FF5252', bg: '#FFF0F0' },
            { icon: 'notifications-outline', label: 'Notifications', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
            { icon: 'people-outline', label: 'Invite Friends', color: Colors.waterBlue, bg: Colors.waterSurface },
            { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.socialTeal, bg: Colors.socialSurface },
            { icon: 'card-outline', label: 'Subscription', color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
            { icon: 'shield-checkmark-outline', label: 'Privacy Policy', color: Colors.textSecondary, bg: Colors.greenLight },
            { icon: 'information-circle-outline', label: 'About BO', color: Colors.green, bg: Colors.greenLight },
          ].map((item, i) => (
            <TouchableOpacity key={i} testID={`settings-${item.label.replace(/\s/g, '-').toLowerCase()}`} style={styles.menuItem} onPress={() => onSettingPress(item.label)} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: item.bg }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Upgrade */}
        {user?.subscription !== 'pro' && (
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <TouchableOpacity testID="upgrade-banner" activeOpacity={0.8}>
              <LinearGradient colors={[Colors.lime, Colors.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.upgradeBanner, Shadow.lg]}>
                <View style={styles.upgradeIcon}><Ionicons name="diamond" size={28} color="#FFF" /></View>
                <View style={{ flex: 1 }}><Text style={styles.upgradeTitle}>Upgrade to BO Pro</Text><Text style={styles.upgradeSub}>Unlimited plans, AI coaching, family bundles & more</Text></View>
                <Ionicons name="arrow-forward-circle" size={28} color="rgba(0,0,0,0.3)" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Logout */}
        <TouchableOpacity testID="logout-button" style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} /><Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePw} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Shadow.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePw(false)}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            {pwError ? <View style={styles.pwErrorBox}><Text style={styles.pwErrorText}>{pwError}</Text></View> : null}
            {pwSuccess ? <View style={styles.pwSuccessBox}><Text style={styles.pwSuccessText}>{pwSuccess}</Text></View> : null}
            <Text style={styles.pwLabel}>Current Password</Text>
            <TextInput style={styles.pwInput} value={curPw} onChangeText={setCurPw} secureTextEntry placeholder="Enter current password" placeholderTextColor={Colors.textTertiary} />
            <Text style={styles.pwLabel}>New Password</Text>
            <TextInput style={styles.pwInput} value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="Min 8 characters" placeholderTextColor={Colors.textTertiary} />
            <Text style={styles.pwLabel}>Confirm New Password</Text>
            <TextInput style={styles.pwInput} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry placeholder="Confirm new password" placeholderTextColor={Colors.textTertiary} />
            <TouchableOpacity onPress={handleChangePw} disabled={pwLoading} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.green, Colors.greenDark]} style={styles.pwButton}>
                {pwLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.pwButtonText}>Change Password</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { paddingBottom: 100 },
  profileHeader: { borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, padding: Spacing.xl, paddingTop: Spacing.lg, alignItems: 'center' },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarLargeText: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  profileName: { color: '#FFF', fontSize: FontSize.h2, fontWeight: '800' },
  profileEmail: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, marginTop: 2 },
  subscriptionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.pill },
  subscriptionText: { color: '#FFF', fontSize: FontSize.caption, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: -20, paddingHorizontal: Spacing.md },
  statBox: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  statNum: { fontSize: FontSize.h3, fontWeight: '800' },
  statSub: { color: Colors.textTertiary, fontSize: FontSize.caption, marginTop: 2 },
  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.h4, fontWeight: '700', marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  goalChip: { borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: Spacing.md },
  goalChipText: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '700', textTransform: 'capitalize' },
  dietChip: { backgroundColor: Colors.socialSurface, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: Spacing.md },
  dietChipText: { color: Colors.socialTeal, fontSize: FontSize.caption, fontWeight: '700', textTransform: 'capitalize' },
  bodyGrid: { flexDirection: 'row', gap: Spacing.sm },
  bodyItem: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  bodyVal: { fontSize: FontSize.h3, fontWeight: '800', marginTop: Spacing.xs },
  bodyLbl: { color: Colors.textTertiary, fontSize: FontSize.caption, marginTop: 2 },
  settingsCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, margin: Spacing.md, marginTop: Spacing.lg, padding: Spacing.md },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '500' },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, margin: Spacing.md, borderRadius: Radius.xl, padding: Spacing.lg },
  upgradeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  upgradeTitle: { color: Colors.textPrimary, fontSize: FontSize.h4, fontWeight: '800' },
  upgradeSub: { color: 'rgba(10,26,18,0.6)', fontSize: FontSize.caption, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, marginTop: Spacing.sm },
  logoutText: { color: Colors.danger, fontSize: FontSize.body, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.bgBase, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  pwErrorBox: { backgroundColor: '#FFF0F0', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  pwErrorText: { color: Colors.danger, fontSize: FontSize.small, textAlign: 'center' },
  pwSuccessBox: { backgroundColor: Colors.greenLight, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  pwSuccessText: { color: Colors.green, fontSize: FontSize.small, textAlign: 'center', fontWeight: '700' },
  pwLabel: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.md, textTransform: 'uppercase' as const, letterSpacing: 1 },
  pwInput: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body, outlineStyle: 'none' as any },
  pwButton: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.xl },
  pwButtonText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
