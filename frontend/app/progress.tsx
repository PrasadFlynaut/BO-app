import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { boLogoColor } from '@/src/assets';
import api from '@/src/api';

const { width: SW } = Dimensions.get('window');

const MOOD_LABELS = ['', 'Bad', 'Okay', 'Good', 'Great', 'Amazing'];
const MOOD_EMOJIS = ['', '\u{1F622}', '\u{1F610}', '\u{1F642}', '\u{1F60A}', '\u{1F929}'];
const MOOD_COLORS = ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E', '#A855F7'];

type DayEntry = { date: string; level: number };
type Stats = { average: number; total_entries: number; current_streak: number; highest: number; lowest: number; this_week_avg: number; top_factors: [string, number][] };

export default function ProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [happiness, setHappiness] = useState<{ by_day: DayEntry[]; average: number; trend: number[] }>({ by_day: [], average: 0, trend: [] });
  const [stats, setStats] = useState<Stats | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [period, setPeriod] = useState(30);

  useFocusEffect(useCallback(() => { loadData(); }, [period]));

  const loadData = async () => {
    setLoading(true);
    try {
      const [hRes, oRes] = await Promise.all([
        api.get(`/v1/happiness/history?days=${period}`),
        api.get(`/v1/progress/overview?days=${period}`),
      ]);
      setHappiness(hRes.data.happiness || hRes.data);
      setStats(hRes.data.stats || null);
      setOverview(oRes.data);
    } catch (e) { console.error('Load progress:', e); }
    setLoading(false);
  };

  const barMaxHeight = 100;
  const trendData = happiness.by_day || [];
  const last14 = trendData.slice(-14);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Animated.View entering={FadeIn.duration(300)} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerBrand}>
          <Image source={boLogoColor} style={s.headerLogo} contentFit="contain" transition={200} />
          <Text style={s.headerTitle}>My Progress</Text>
        </View>
        <View style={{ width: 24 }} />
      </Animated.View>

      {loading ? (
        <View style={s.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={Colors.green} />}
        >
          {/* Period Selector */}
          <View style={s.periodRow}>
            {[7, 14, 30, 90].map(d => (
              <TouchableOpacity key={d} onPress={() => setPeriod(d)} style={[s.periodChip, period === d && s.periodActive]}>
                <Text style={[s.periodText, period === d && s.periodActiveText]}>{d}d</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Happiness Summary */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={s.sectionTitle}>HAPPINESS</Text>
            <View style={[s.happinessCard, Shadow.sm]}>
              <View style={s.happinessHeader}>
                <View style={s.happinessAvg}>
                  <Text style={s.happinessEmoji}>{MOOD_EMOJIS[Math.round(stats?.average || 0)] || '\u{1F642}'}</Text>
                  <View>
                    <Text style={s.happinessScore}>{stats?.average || 0}</Text>
                    <Text style={s.happinessLabel}>avg happiness</Text>
                  </View>
                </View>
                <View style={s.happinessStats}>
                  <View style={s.miniStat}>
                    <Ionicons name="flame" size={14} color={Colors.nutritionOrange} />
                    <Text style={s.miniStatVal}>{stats?.current_streak || 0}</Text>
                    <Text style={s.miniStatLabel}>streak</Text>
                  </View>
                  <View style={s.miniStat}>
                    <Ionicons name="calendar" size={14} color={Colors.waterBlue} />
                    <Text style={s.miniStatVal}>{stats?.total_entries || 0}</Text>
                    <Text style={s.miniStatLabel}>logs</Text>
                  </View>
                </View>
              </View>

              {/* Mini bar chart */}
              {last14.length > 0 && (
                <View style={s.chartWrap}>
                  <View style={s.chartBars}>
                    {last14.map((d, i) => {
                      const h = (d.level / 5) * barMaxHeight;
                      return (
                        <View key={i} style={s.barCol}>
                          <View style={[s.bar, { height: h, backgroundColor: MOOD_COLORS[d.level] || '#CCC' }]} />
                          <Text style={s.barLabel}>{d.date.slice(-2)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
              {last14.length === 0 && (
                <View style={s.emptyChart}>
                  <Ionicons name="analytics-outline" size={28} color={Colors.textTertiary} />
                  <Text style={s.emptyChartText}>No happiness data yet. Start logging today!</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Top Factors */}
          {stats?.top_factors && stats.top_factors.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text style={s.sectionTitle}>TOP FACTORS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}>
                {stats.top_factors.map(([factor, count], i) => (
                  <View key={i} style={[s.factorChip, Shadow.sm]}>
                    <Text style={s.factorEmoji}>{factor === 'exercise' ? '\u{1F3CB}' : factor === 'sleep' ? '\u{1F634}' : factor === 'nutrition' ? '\u{1F957}' : factor === 'social' ? '\u{1F465}' : factor === 'work' ? '\u{1F4BC}' : '\u{2764}'}</Text>
                    <Text style={s.factorName}>{factor}</Text>
                    <Text style={s.factorCount}>{count}x</Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Wellness Overview Cards */}
          {overview && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <Text style={s.sectionTitle}>WELLNESS OVERVIEW</Text>
              <View style={s.overviewGrid}>
                <View style={[s.overviewCard, Shadow.sm, { borderLeftColor: Colors.waterBlue }]}>
                  <Ionicons name="water" size={22} color={Colors.waterBlue} />
                  <Text style={s.ovValue}>{overview.water?.average_glasses || 0}</Text>
                  <Text style={s.ovLabel}>avg glasses/day</Text>
                  <Text style={s.ovSub}>{overview.water?.total_logs || 0} logs</Text>
                </View>
                <View style={[s.overviewCard, Shadow.sm, { borderLeftColor: Colors.fitnessPurple }]}>
                  <Ionicons name="moon" size={22} color={Colors.fitnessPurple} />
                  <Text style={s.ovValue}>{overview.sleep?.average_hours || 0}h</Text>
                  <Text style={s.ovLabel}>avg sleep/night</Text>
                  <Text style={s.ovSub}>{overview.sleep?.total_logs || 0} logs</Text>
                </View>
                <View style={[s.overviewCard, Shadow.sm, { borderLeftColor: Colors.green }]}>
                  <Ionicons name="footsteps" size={22} color={Colors.green} />
                  <Text style={s.ovValue}>{(overview.steps?.average || 0).toLocaleString()}</Text>
                  <Text style={s.ovLabel}>avg steps/day</Text>
                  <Text style={s.ovSub}>{(overview.steps?.total || 0).toLocaleString()} total</Text>
                </View>
                <View style={[s.overviewCard, Shadow.sm, { borderLeftColor: Colors.nutritionOrange }]}>
                  <Ionicons name="scale" size={22} color={Colors.nutritionOrange} />
                  <Text style={s.ovValue}>{overview.weight?.current || '--'}kg</Text>
                  <Text style={s.ovLabel}>{overview.weight?.change > 0 ? '+' : ''}{overview.weight?.change || 0}kg</Text>
                  <Text style={s.ovSub}>{overview.weight?.total_logs || 0} weigh-ins</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Activity Summary */}
          {overview && (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <Text style={s.sectionTitle}>ACTIVITY</Text>
              <View style={[s.activityCard, Shadow.sm]}>
                <View style={s.activityRow}>
                  <Ionicons name="book" size={20} color={Colors.fitnessPurple} />
                  <Text style={s.activityLabel}>Journal Entries</Text>
                  <Text style={s.activityVal}>{overview.activity?.journal_entries || 0}</Text>
                </View>
                <View style={s.actDivider} />
                <View style={s.activityRow}>
                  <Ionicons name="restaurant" size={20} color={Colors.nutritionOrange} />
                  <Text style={s.activityLabel}>Meals Logged</Text>
                  <Text style={s.activityVal}>{overview.activity?.meals_logged || 0}</Text>
                </View>
                <View style={s.actDivider} />
                <View style={s.activityRow}>
                  <Ionicons name="happy" size={20} color="#A855F7" />
                  <Text style={s.activityLabel}>Happiness Check-ins</Text>
                  <Text style={s.activityVal}>{stats?.total_entries || 0}</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Daily Timeline */}
          {overview?.timeline && overview.timeline.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <Text style={s.sectionTitle}>DAILY TIMELINE</Text>
              {overview.timeline.slice(0, 10).map((day: any, i: number) => (
                <View key={i} style={[s.timelineRow, Shadow.sm]}>
                  <View style={s.timelineDate}>
                    <Text style={s.timelineDateNum}>{day.date?.slice(-2)}</Text>
                    <Text style={s.timelineDateMonth}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(day.date?.slice(5,7) || '1') - 1]}</Text>
                  </View>
                  <View style={s.timelineDot}>
                    <View style={[s.dot, { backgroundColor: MOOD_COLORS[day.happiness] || '#CCC' }]} />
                  </View>
                  <View style={s.timelineContent}>
                    <Text style={s.timelineMood}>{MOOD_EMOJIS[day.happiness] || ''} {MOOD_LABELS[day.happiness] || 'N/A'}</Text>
                    <View style={s.timelineTags}>
                      {day.water_glasses && <Text style={s.tTag}>{'\u{1F4A7}'} {day.water_glasses}gl</Text>}
                      {day.sleep_hours && <Text style={s.tTag}>{'\u{1F634}'} {day.sleep_hours}h</Text>}
                    </View>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.sm, gap: Spacing.sm },
  headerLogo: { width: 28, height: 28 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  periodRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.borderLight },
  periodActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  periodText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  periodActiveText: { color: '#FFF' },
  sectionTitle: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  happinessCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, marginHorizontal: Spacing.lg, padding: Spacing.lg },
  happinessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  happinessAvg: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  happinessEmoji: { fontSize: 40 },
  happinessScore: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  happinessLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  happinessStats: { flexDirection: 'row', gap: Spacing.lg },
  miniStat: { alignItems: 'center', gap: 2 },
  miniStatVal: { fontSize: FontSize.body, fontWeight: '800', color: Colors.textPrimary },
  miniStatLabel: { fontSize: 10, color: Colors.textTertiary },
  chartWrap: { marginTop: Spacing.lg },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, gap: 2 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 8, color: Colors.textTertiary, marginTop: 4 },
  emptyChart: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyChartText: { fontSize: FontSize.small, color: Colors.textTertiary, textAlign: 'center' },
  factorChip: { backgroundColor: '#FFF', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', gap: 4 },
  factorEmoji: { fontSize: 20 },
  factorName: { fontSize: FontSize.caption, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  factorCount: { fontSize: 10, color: Colors.textTertiary },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  overviewCard: { width: (SW - Spacing.lg * 2 - Spacing.sm) / 2, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, gap: 4, borderLeftWidth: 3 },
  ovValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  ovLabel: { fontSize: FontSize.caption, color: Colors.textSecondary },
  ovSub: { fontSize: 10, color: Colors.textTertiary },
  activityCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, marginHorizontal: Spacing.lg, padding: Spacing.md },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  activityLabel: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary },
  activityVal: { fontSize: FontSize.body, fontWeight: '800', color: Colors.textPrimary },
  actDivider: { height: 1, backgroundColor: '#F5F5F5' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, gap: Spacing.sm },
  timelineDate: { alignItems: 'center', width: 36 },
  timelineDateNum: { fontSize: FontSize.body, fontWeight: '800', color: Colors.textPrimary },
  timelineDateMonth: { fontSize: 10, color: Colors.textTertiary },
  timelineDot: { alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  timelineContent: { flex: 1 },
  timelineMood: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textPrimary },
  timelineTags: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  tTag: { fontSize: 11, color: Colors.textTertiary },
});
