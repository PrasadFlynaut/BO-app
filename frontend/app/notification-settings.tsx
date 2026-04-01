import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import api from '@/src/api';

type Prefs = {
  mealReminders: boolean; waterReminders: boolean; sleepReminders: boolean;
  workoutReminders: boolean; wellnessReminders: boolean; badgeEarned: boolean;
  communityActivity: boolean; adminAnnouncements: boolean;
  quietHoursEnabled: boolean; quietHoursStart: string; quietHoursEnd: string;
};

const DEFAULT: Prefs = {
  mealReminders: true, waterReminders: true, sleepReminders: true,
  workoutReminders: true, wellnessReminders: true, badgeEarned: true,
  communityActivity: true, adminAnnouncements: true,
  quietHoursEnabled: false, quietHoursStart: '22:00', quietHoursEnd: '07:00',
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/v1/notifications/preferences');
        const p = data.preferences || data;
        setPrefs({ ...DEFAULT, ...p });
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const toggle = (key: keyof Prefs) => {
    if (key === 'adminAnnouncements') return;
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(next), 500);
      return next;
    });
  };

  const toggleAll = () => {
    const allOn = prefs.mealReminders && prefs.waterReminders && prefs.sleepReminders && prefs.workoutReminders && prefs.wellnessReminders && prefs.badgeEarned && prefs.communityActivity;
    setPrefs(prev => {
      const val = !allOn;
      const next = { ...prev, mealReminders: val, waterReminders: val, sleepReminders: val, workoutReminders: val, wellnessReminders: val, badgeEarned: val, communityActivity: val };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(next), 500);
      return next;
    });
  };

  const save = async (p: Prefs) => {
    try {
      await api.put('/v1/notifications/preferences', p);
    } catch (e) { console.error('Save error:', e); }
  };

  const allOn = prefs.mealReminders && prefs.waterReminders && prefs.sleepReminders && prefs.workoutReminders && prefs.wellnessReminders && prefs.badgeEarned && prefs.communityActivity;

  type Row = { key: keyof Prefs; label: string; sub?: string; disabled?: boolean };
  const GROUPS: { title: string; rows: Row[] }[] = [
    { title: 'REMINDERS', rows: [
      { key: 'mealReminders', label: 'Meal Reminders', sub: 'Reminders for breakfast, lunch, dinner' },
      { key: 'waterReminders', label: 'Water Reminders', sub: 'Stay hydrated throughout the day' },
      { key: 'sleepReminders', label: 'Sleep Reminders', sub: 'Bedtime and wake-up reminders' },
      { key: 'workoutReminders', label: 'Workout Reminders', sub: 'Daily exercise motivation' },
      { key: 'wellnessReminders', label: 'Wellness Program Reminders', sub: 'Program check-in alerts' },
    ]},
    { title: 'SOCIAL', rows: [
      { key: 'badgeEarned', label: 'Badge Earned', sub: 'Celebrate your achievements' },
      { key: 'communityActivity', label: 'Community Activity', sub: 'Likes and comments on your posts' },
    ]},
    { title: 'SYSTEM', rows: [
      { key: 'adminAnnouncements', label: 'Admin Announcements', sub: 'Critical announcements cannot be disabled', disabled: true },
    ]},
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Master toggle */}
        <Animated.View entering={FadeInDown.duration(350)} style={s.masterCard}>
          <View>
            <Text style={s.masterLabel}>All Notifications</Text>
            <Text style={s.masterSub}>Toggle all notification types</Text>
          </View>
          <Switch value={allOn} onValueChange={toggleAll} trackColor={{ false: '#D1D5DB', true: Colors.green }} thumbColor="#FFF" />
        </Animated.View>

        {GROUPS.map((g, gi) => (
          <Animated.View key={gi} entering={FadeInDown.delay((gi + 1) * 80).duration(350)}>
            <Text style={s.sectionHeader}>{g.title}</Text>
            <View style={s.sectionCard}>
              {g.rows.map((row, ri) => (
                <View key={ri} style={[s.toggleRow, ri < g.rows.length - 1 && s.rowBorder]}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[s.toggleLabel, row.disabled && { color: '#9CA3AF' }]}>{row.label}</Text>
                    {row.sub && <Text style={s.toggleSub}>{row.sub}</Text>}
                  </View>
                  <Switch
                    value={!!prefs[row.key]}
                    onValueChange={() => toggle(row.key)}
                    disabled={row.disabled}
                    trackColor={{ false: '#D1D5DB', true: Colors.green }}
                    thumbColor="#FFF"
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        ))}

        {/* Quiet Hours */}
        <Animated.View entering={FadeInDown.delay(320).duration(350)}>
          <Text style={s.sectionHeader}>QUIET HOURS</Text>
          <View style={s.quietCard}>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Enable Quiet Hours</Text>
                <Text style={s.toggleSub}>No notifications during quiet time</Text>
              </View>
              <Switch value={prefs.quietHoursEnabled} onValueChange={() => toggle('quietHoursEnabled')} trackColor={{ false: '#D1D5DB', true: Colors.green }} thumbColor="#FFF" />
            </View>
            {prefs.quietHoursEnabled && (
              <View style={s.timeRow}>
                <View style={s.timeBlock}>
                  <Ionicons name="moon-outline" size={18} color={Colors.fitnessPurple} />
                  <Text style={s.timeLabel}>Start</Text>
                  <Text style={s.timeValue}>{prefs.quietHoursStart}</Text>
                </View>
                <View style={s.timeSep}><Text style={{ color: '#9CA3AF' }}>to</Text></View>
                <View style={s.timeBlock}>
                  <Ionicons name="sunny-outline" size={18} color={Colors.nutritionOrange} />
                  <Text style={s.timeLabel}>End</Text>
                  <Text style={s.timeValue}>{prefs.quietHoursEnd}</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  masterCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.greenLight, margin: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.green + '30' },
  masterLabel: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  masterSub: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  sectionHeader: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.sm, marginLeft: Spacing.lg },
  sectionCard: { backgroundColor: '#FFF', marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  toggleLabel: { fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: '500' },
  toggleSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  quietCard: { backgroundColor: '#F7F7F7', marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  timeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: 14 },
  timeBlock: { flex: 1, alignItems: 'center', gap: 4 },
  timeSep: { paddingHorizontal: 8 },
  timeLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  timeValue: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
});
