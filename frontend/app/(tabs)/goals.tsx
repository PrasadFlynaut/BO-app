import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
  Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, useAnimatedStyle, withTiming,
  withDelay, withSequence, Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';
import MoodEmoji, { MOOD_LABELS, MOOD_COLORS } from '@/src/components/MoodEmoji';

const LIFE_GOAL_OPTIONS = [
  { name: 'Stay Fit', icon: 'fitness' },
  { name: 'Eat Healthy', icon: 'nutrition' },
  { name: 'Be Active', icon: 'walk' },
  { name: 'Become a Role Model', icon: 'star' },
  { name: 'Build Confidence', icon: 'shield-checkmark' },
  { name: 'Lose Weight', icon: 'trending-down' },
  { name: 'Mental Wellness', icon: 'happy' },
];

function AnimatedProgressBar({ value, max, color, height = 10 }: { value: number; max: number; color: string; height?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(300, withTiming(Math.min(1, value / Math.max(max, 1)), { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [value, max]);
  const style = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    height, backgroundColor: color, borderRadius: height / 2,
  }));
  return (
    <View style={{ height, backgroundColor: color + '15', borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View style={style} />
    </View>
  );
}

// ============ ANIMATED COUNTER ============
function AnimatedCounter({ value, color, size = 22 }: { value: number; color: string; size?: number }) {
  const scale = useSharedValue(1);
  const prevVal = useRef(value);

  useEffect(() => {
    if (value !== prevVal.current) {
      scale.value = withSequence(
        withTiming(1.08, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) })
      );
      prevVal.current = value;
    }
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <Text style={{ fontSize: size, fontWeight: '800', color }}>{value}%</Text>
    </Animated.View>
  );
}

// ============ BOTTOM SHEET WRAPPER ============
function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={ms.overlay}
        >
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={ms.backdrop} />
          </TouchableWithoutFeedback>
        <View style={ms.sheet}>
          <View style={ms.handle} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={ms.sheetContent}>
            {children}
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
});

// ============ MAIN SCREEN ============
export default function GoalsScreen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [questionnaire, setQuestionnaire] = useState<any>({});
  const [showHappinessModal, setShowHappinessModal] = useState(false);
  const [happinessLevel, setHappinessLevel] = useState(3);
  const [happinessNote, setHappinessNote] = useState('');
  const [showEditGoals, setShowEditGoals] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useFocusEffect(useCallback(() => { loadGoals(); }, []));

  const loadGoals = async () => {
    setLoading(true);
    try {
      const [goalsRes, progressRes] = await Promise.all([
        api.get('/v1/goals').catch(() => ({ data: { goals: {}, questionnaire: {} } })),
        api.get('/v1/goals/progress').catch(() => ({ data: { goalProgress: [] } })),
      ]);
      setGoals(goalsRes.data.goals || {});
      setQuestionnaire(goalsRes.data.questionnaire || {});
      setProgress(progressRes.data.goalProgress || []);
      setSelectedGoals(goalsRes.data.goals?.lifeGoals || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const onRefresh = async () => { setRefreshing(true); await loadGoals(); setRefreshing(false); };

  const saveHappiness = async () => {
    try {
      await api.post('/v1/trackers/happiness', { level: happinessLevel, note: happinessNote.trim() });
      setShowHappinessModal(false);
      setHappinessNote('');
      Keyboard.dismiss();
      loadGoals();
    } catch (e) { console.error(e); }
  };

  const toggleLifeGoal = (goal: string) => {
    setSelectedGoals(prev => {
      if (prev.includes(goal)) {
        if (prev.length <= 1) return prev;
        return prev.filter(g => g !== goal);
      }
      return [...prev, goal];
    });
  };

  const saveGoals = async () => {
    try {
      await api.put('/onboarding/life-goals', {
        life_goals: selectedGoals,
        happiness_level: goals?.happiness ? Math.round(goals.happiness / 20) : 5,
        review_text: '',
      });
      setShowEditGoals(false);
      refreshUser();
      loadGoals();
    } catch (e) { console.error(e); }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const { data } = await api.post('/v1/reports/generate');
      setReport(data.report);
      setShowReportModal(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate report');
    }
    setGeneratingReport(false);
  };

  const shareReport = async () => {
    if (!report) return;
    const text = `BO Wellness Progress Report\n\nPeriod: ${report.period?.start} to ${report.period?.end}\n\nMeals: ${report.meals?.total_logged} logged (${report.meals?.total_calories} cal)\nWater: ${report.water?.total_glasses} glasses (avg ${report.water?.avg_daily}/day)\nSleep: avg ${report.sleep?.avg_duration_hrs}h, quality ${report.sleep?.avg_quality}/5\nWalking: ${report.walking?.total_steps?.toLocaleString()} steps (avg ${report.walking?.avg_daily_steps?.toLocaleString()}/day)\nActivity: ${report.activity?.total_met_minutes} MET-min (${report.activity?.sessions} sessions)\nHappiness: ${report.happiness?.average}/5 avg\n\nGenerated: ${new Date(report.generated_at).toLocaleDateString()}`;
    try {
      await Share.share({ message: text, title: 'BO Wellness Report' });
    } catch (e) { console.error(e); }
  };

  const happinessPercent = goals?.happiness || 50;
  const happinessColor = happinessPercent >= 80 ? Colors.green : happinessPercent >= 60 ? Colors.nutritionOrange : happinessPercent >= 40 ? '#FFB74D' : Colors.danger;

  function getProgressColor(p: number) {
    if (p >= 75) return Colors.green;
    if (p >= 50) return Colors.nutritionOrange;
    if (p >= 25) return Colors.waterBlue;
    return '#94A3B8';
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>My Goals</Text>
          <TouchableOpacity onPress={() => setShowEditGoals(true)} style={s.editBtnWrap} activeOpacity={0.7}>
            <Ionicons name="pencil" size={14} color={Colors.green} />
            <Text style={s.editBtn}>Edit</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
        ) : (
          <>
            {/* Life Goals Pills */}
            <Animated.View entering={FadeInDown.delay(0).duration(350)}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScroll}>
                {(goals?.lifeGoals || []).map((g: string, i: number) => (
                  <Animated.View key={g} entering={FadeIn.delay(i * 80)}>
                    <View style={s.goalPill}>
                      <Text style={s.goalPillText}>{g}</Text>
                    </View>
                  </Animated.View>
                ))}
                {(goals?.lifeGoals || []).length === 0 && (
                  <TouchableOpacity onPress={() => setShowEditGoals(true)} style={s.addGoalPill}>
                    <Ionicons name="add" size={16} color={Colors.green} />
                    <Text style={s.addGoalText}>Set Your Goals</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </Animated.View>

            {/* Happiness Gauge Card */}
            <Animated.View entering={FadeInDown.delay(100).duration(350)}>
              <TouchableOpacity onPress={() => setShowHappinessModal(true)} style={[s.happinessCard, Shadow.sm]} activeOpacity={0.85}>
                <View style={s.happinessHeader}>
                  <View style={s.happinessHeaderLeft}>
                    <Ionicons name="happy" size={20} color={happinessColor} />
                    <Text style={s.happinessTitle}>Happiness Level</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </View>
                <View style={s.happinessGauge}>
                  <AnimatedProgressBar value={happinessPercent} max={100} color={happinessColor} height={12} />
                  <AnimatedCounter value={happinessPercent} color={happinessColor} />
                </View>
                <Text style={s.happinessHint}>Tap to rate how you feel today</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Goal Progress */}
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Weekly Progress</Text>
              <View style={s.weekBadge}><Text style={s.weekBadgeText}>This week</Text></View>
            </View>

            {progress.map((p: any, idx: number) => {
              const color = getProgressColor(p.percent);
              return (
                <Animated.View key={p.name} entering={FadeInDown.delay(200 + idx * 100).duration(350)}>
                  <View style={[s.progressCard, Shadow.sm]}>
                    <View style={s.progressHeader}>
                      <View style={[s.progressIcon, { backgroundColor: color + '15' }]}>
                        <Ionicons name={(p.icon || 'ellipse') as any} size={22} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.progressName}>{p.name}</Text>
                        <Text style={s.progressStat}>{p.current?.toLocaleString()} / {p.target?.toLocaleString()} {p.unit}</Text>
                      </View>
                      <AnimatedCounter value={p.percent} color={color} size={18} />
                    </View>
                    <AnimatedProgressBar value={p.percent} max={100} color={color} height={8} />
                    {p.streak > 0 && (
                      <Animated.View entering={FadeIn.delay(400)} style={s.streakRow}>
                        <Ionicons name="flame" size={14} color={Colors.nutritionOrange} />
                        <Text style={s.streakText}>{p.streak} day streak!</Text>
                      </Animated.View>
                    )}
                    {/* Milestones */}
                    <View style={s.milestoneRow}>
                      {[25, 50, 75, 100].map(m => (
                        <View key={m} style={[s.milestone, p.percent >= m && s.milestoneAchieved]}>
                          {p.percent >= m ? (
                            <Ionicons name="checkmark" size={10} color={Colors.green} />
                          ) : (
                            <Text style={s.milestoneText}>{m}%</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              );
            })}

            {/* Health Profile */}
            <Animated.View entering={FadeInDown.delay(600).duration(350)}>
              <TouchableOpacity onPress={() => setShowQuestionnaire(true)} activeOpacity={0.85}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>Health Profile</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </View>
              </TouchableOpacity>
              <View style={[s.questionnaireCard, Shadow.sm]}>
                {renderQField('Sleep', `${questionnaire.sleep_hours || 7} hours`, 'moon')}
                {renderQField('Busyness', `${questionnaire.lifestyle_busyness || 3}/5`, 'time')}
                {renderQField('Diet Restriction', questionnaire.dietary_restriction ? 'Yes' : 'No', 'nutrition')}
                {renderQField('Nutritionist', questionnaire.under_nutritionist ? 'Yes' : 'No', 'medkit')}
              </View>
            </Animated.View>
            {/* Download Report Button */}
            <Animated.View entering={FadeInDown.delay(700).duration(350)}>
              <TouchableOpacity onPress={generateReport} style={[s.reportBtn, Shadow.sm]} activeOpacity={0.8} disabled={generatingReport}>
                {generatingReport ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="document-text" size={20} color="#FFF" />
                    <Text style={s.reportBtnText}>Download Progress Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* Happiness Modal */}
      <BottomSheet visible={showHappinessModal} onClose={() => { setShowHappinessModal(false); Keyboard.dismiss(); }}>
        <Text style={s.modalTitle}>How are you feeling?</Text>
        <Text style={s.modalSubtext}>Track your daily mood to see patterns over time</Text>
        <View style={s.emojiRow}>
          {MOOD_LABELS.map((_, idx) => (
            <MoodEmoji
              key={idx}
              index={idx}
              isSelected={happinessLevel === idx + 1}
              onPress={() => setHappinessLevel(idx + 1)}
            />
          ))}
        </View>
        <Text style={s.inputLabel}>Add a note (optional)</Text>
        <TextInput
          style={[s.modalInput, { height: 80, textAlignVertical: 'top', paddingTop: 14 }]}
          placeholder="What made you feel this way?"
          placeholderTextColor={Colors.textTertiary}
          value={happinessNote}
          onChangeText={setHappinessNote}
          multiline
        />
        <TouchableOpacity onPress={saveHappiness} style={s.modalSaveBtn} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>Save Mood</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowHappinessModal(false); Keyboard.dismiss(); }} style={s.modalCancelBtn}>
          <Text style={s.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Edit Goals Modal */}
      <BottomSheet visible={showEditGoals} onClose={() => setShowEditGoals(false)}>
        <Text style={s.modalTitle}>Edit Life Goals</Text>
        <Text style={s.modalSubtext}>Select the goals you want to focus on</Text>
        {LIFE_GOAL_OPTIONS.map((g, idx) => (
          <Animated.View key={g.name} entering={FadeInDown.delay(idx * 50).duration(300)}>
            <TouchableOpacity
              style={[s.goalToggleCard, selectedGoals.includes(g.name) && s.goalToggleActive]}
              onPress={() => toggleLifeGoal(g.name)}
              activeOpacity={0.7}
            >
              <View style={[s.goalToggleIcon, selectedGoals.includes(g.name) && s.goalToggleIconActive]}>
                <Ionicons name={g.icon as any} size={20} color={selectedGoals.includes(g.name) ? Colors.green : Colors.textTertiary} />
              </View>
              <Text style={[s.goalToggleText, selectedGoals.includes(g.name) && s.goalToggleTextActive]}>{g.name}</Text>
              <View style={[s.checkbox, selectedGoals.includes(g.name) && s.checkboxActive]}>
                {selectedGoals.includes(g.name) && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
        <TouchableOpacity onPress={saveGoals} style={s.modalSaveBtn} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>Save Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowEditGoals(false)} style={s.modalCancelBtn}>
          <Text style={s.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Questionnaire Detail Modal */}
      <BottomSheet visible={showQuestionnaire} onClose={() => setShowQuestionnaire(false)}>
        <Text style={s.modalTitle}>Health Profile</Text>
        <Text style={s.modalSubtext}>Your health questionnaire answers</Text>
        {renderDetailField('Favorite Fast Food', questionnaire.favorite_fast_food || 'Not set')}
        {renderDetailField('Dietary Restriction', questionnaire.dietary_restriction ? 'Yes' : 'No')}
        {renderDetailField('Under Nutritionist', questionnaire.under_nutritionist ? 'Yes' : 'No')}
        {renderDetailField('Health Info', questionnaire.health_info || 'Not provided')}
        {renderDetailField('Lifestyle Busyness', `${questionnaire.lifestyle_busyness || 3} out of 5`)}
        {renderDetailField('Sleep Hours', `${questionnaire.sleep_hours || 7} hours per night`)}
        {renderDetailField('Current Workout Plan', questionnaire.current_workout_plan || 'Not set')}
        {renderDetailField('Best Meal', questionnaire.best_meal || 'Not set')}
        <TouchableOpacity onPress={() => setShowQuestionnaire(false)} style={s.modalSaveBtn} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>Close</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Report Modal */}
      <BottomSheet visible={showReportModal} onClose={() => setShowReportModal(false)}>
        <Text style={s.modalTitle}>30-Day Progress Report</Text>
        {report && (
          <>
            <Text style={s.reportPeriod}>{report.period?.start} to {report.period?.end}</Text>
            <View style={s.reportGrid}>
              {renderReportItem('Meals', `${report.meals?.total_logged || 0} logged`, `${(report.meals?.total_calories || 0).toLocaleString()} cal`, 'restaurant', Colors.nutritionOrange)}
              {renderReportItem('Water', `${report.water?.total_glasses || 0} glasses`, `avg ${report.water?.avg_daily || 0}/day`, 'water', Colors.waterBlue)}
              {renderReportItem('Sleep', `avg ${report.sleep?.avg_duration_hrs || 0}h`, `quality ${report.sleep?.avg_quality || 0}/5`, 'moon', Colors.fitnessPurple)}
              {renderReportItem('Walking', `${(report.walking?.total_steps || 0).toLocaleString()} steps`, `avg ${(report.walking?.avg_daily_steps || 0).toLocaleString()}/day`, 'walk', Colors.socialTeal)}
              {renderReportItem('Activity', `${report.activity?.total_met_minutes || 0} MET-min`, `${report.activity?.sessions || 0} sessions`, 'barbell', Colors.danger)}
              {renderReportItem('Happiness', `${report.happiness?.average || 0}/5`, `${report.happiness?.entries || 0} entries`, 'happy', Colors.green)}
            </View>
            <TouchableOpacity onPress={shareReport} style={s.shareBtn} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={18} color={Colors.green} />
              <Text style={s.shareBtnText}>Share Report</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => setShowReportModal(false)} style={s.modalSaveBtn} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>Close</Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

function renderQField(label: string, value: string, icon: string) {
  return (
    <View style={s.qField}>
      <View style={s.qFieldLeft}>
        <Ionicons name={icon as any} size={16} color={Colors.textTertiary} />
        <Text style={s.qLabel}>{label}</Text>
      </View>
      <Text style={s.qValue}>{value}</Text>
    </View>
  );
}

function renderDetailField(label: string, value: string) {
  return (
    <View style={s.detailField}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

function renderReportItem(title: string, value: string, sub: string, icon: string, color: string) {
  return (
    <View style={s.reportItem}>
      <View style={[s.reportItemIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={s.reportItemTitle}>{title}</Text>
      <Text style={[s.reportItemValue, { color }]}>{value}</Text>
      <Text style={s.reportItemSub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  loadWrap: { paddingVertical: 80, alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 4 },
  title: { fontSize: FontSize.h2, fontWeight: '800', color: Colors.textPrimary },
  editBtnWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.greenLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  editBtn: { fontSize: FontSize.small, color: Colors.green, fontWeight: '700' },

  // Pills
  pillScroll: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 },
  goalPill: { backgroundColor: Colors.greenLight, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.green },
  goalPillText: { color: Colors.green, fontWeight: '700', fontSize: FontSize.small },
  addGoalPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.borderLight, borderStyle: 'dashed' },
  addGoalText: { color: Colors.green, fontWeight: '600', fontSize: FontSize.small },

  // Happiness
  happinessCard: { marginHorizontal: Spacing.lg, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16, marginBottom: Spacing.md },
  happinessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  happinessHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  happinessTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  happinessGauge: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  happinessHint: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 10 },

  // Section
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  weekBadge: { backgroundColor: Colors.waterBlue + '12', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  weekBadgeText: { fontSize: FontSize.caption, color: Colors.waterBlue, fontWeight: '600' },

  // Progress
  progressCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  progressIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  progressStat: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  streakText: { fontSize: FontSize.caption, color: Colors.nutritionOrange, fontWeight: '600' },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  milestone: { width: 32, height: 26, backgroundColor: '#F1F5F9', borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  milestoneAchieved: { backgroundColor: Colors.greenLight },
  milestoneText: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },

  // Questionnaire
  questionnaireCard: { marginHorizontal: Spacing.lg, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16, marginBottom: Spacing.lg },
  qField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  qFieldLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  qLabel: { fontSize: FontSize.small, color: Colors.textSecondary },
  qValue: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textPrimary },

  // Detail fields
  detailField: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailLabel: { fontSize: FontSize.caption, color: Colors.textTertiary, fontWeight: '500', marginBottom: 4 },
  detailValue: { fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: '600' },

  // Modal
  modalTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.sm },
  modalSubtext: { fontSize: FontSize.small, color: Colors.textTertiary, marginTop: 4, marginBottom: Spacing.sm },
  inputLabel: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },
  modalInput: { backgroundColor: '#F7F8FA', borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 16, fontSize: FontSize.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight },
  modalSaveBtn: { backgroundColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md },
  modalSaveBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 14 },
  modalCancelText: { color: Colors.textTertiary, fontSize: FontSize.body },

  // Emoji
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: Spacing.md },
  emojiBtn: { alignItems: 'center', gap: 4, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  emojiText: { fontSize: 32 },
  emojiLabel: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary },
  emojiLabelActive: { color: Colors.green },

  // Goal toggles
  goalToggleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 8 },
  goalToggleActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  goalToggleIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  goalToggleIconActive: { backgroundColor: Colors.green + '15' },
  goalToggleText: { flex: 1, fontSize: FontSize.body, fontWeight: '600', color: Colors.textSecondary },
  goalToggleTextActive: { color: Colors.textPrimary },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.green, borderColor: Colors.green },

  // Report
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: Spacing.lg, backgroundColor: Colors.waterBlue, borderRadius: Radius.lg, paddingVertical: 16, marginBottom: Spacing.lg },
  reportBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  reportPeriod: { fontSize: FontSize.small, color: Colors.textTertiary, marginTop: 4, marginBottom: Spacing.md },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reportItem: { width: '47%' as any, backgroundColor: '#F7F8FA', borderRadius: Radius.lg, padding: 14, alignItems: 'center', gap: 4 },
  reportItemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportItemTitle: { fontSize: FontSize.caption, color: Colors.textTertiary, fontWeight: '600' },
  reportItemValue: { fontSize: FontSize.body, fontWeight: '800' },
  reportItemSub: { fontSize: 10, color: Colors.textTertiary },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 12, marginTop: Spacing.md },
  shareBtnText: { color: Colors.green, fontWeight: '700', fontSize: FontSize.small },
});
