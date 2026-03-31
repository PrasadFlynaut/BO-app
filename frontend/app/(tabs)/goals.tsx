import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const LIFE_GOAL_OPTIONS = [
  { name: 'Stay Fit', icon: 'fitness' },
  { name: 'Eat Healthy', icon: 'nutrition' },
  { name: 'Be Active', icon: 'walk' },
  { name: 'Become a Role Model', icon: 'star' },
  { name: 'Build Confidence', icon: 'shield-checkmark' },
];

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
      await api.post('/v1/trackers/happiness', {
        level: happinessLevel,
        note: happinessNote.trim(),
      });
      setShowHappinessModal(false);
      setHappinessNote('');
      loadGoals();
    } catch (e) { console.error(e); }
  };

  const toggleLifeGoal = (goal: string) => {
    setSelectedGoals(prev => {
      if (prev.includes(goal)) {
        if (prev.length <= 1) return prev; // At least one
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

  const happinessPercent = goals?.happiness || 50;
  const happinessColor = happinessPercent >= 80 ? Colors.green : happinessPercent >= 60 ? Colors.nutritionOrange : Colors.danger;

  const EMOJI_FACES = ['😢', '😟', '😐', '😊', '😁'];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>My Goals</Text>
          <TouchableOpacity onPress={() => setShowEditGoals(true)}>
            <Text style={s.editBtn}>Edit Goals</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
        ) : (
          <>
            {/* Life Goals Pills */}
            <Animated.View entering={FadeInDown.delay(0).duration(400)}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScroll}>
                {(goals?.lifeGoals || []).map((g: string, i: number) => (
                  <View key={i} style={s.goalPill}>
                    <Text style={s.goalPillText}>{g}</Text>
                  </View>
                ))}
                {(goals?.lifeGoals || []).length === 0 && (
                  <TouchableOpacity onPress={() => setShowEditGoals(true)} style={s.addGoalPill}>
                    <Ionicons name="add" size={16} color={Colors.green} />
                    <Text style={s.addGoalText}>Add Goals</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </Animated.View>

            {/* Happiness Gauge */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <TouchableOpacity onPress={() => setShowHappinessModal(true)} style={[s.happinessCard, Shadow.sm]} activeOpacity={0.85}>
                <View style={s.happinessHeader}>
                  <Text style={s.happinessTitle}>Happiness Level</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </View>
                <View style={s.happinessGauge}>
                  <View style={s.gaugeOuter}>
                    <View style={[s.gaugeFill, { width: `${happinessPercent}%` as any, backgroundColor: happinessColor }]} />
                  </View>
                  <Text style={[s.gaugePercent, { color: happinessColor }]}>{happinessPercent}%</Text>
                </View>
                <Text style={s.happinessHint}>Tap to rate how you feel today</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Goal Progress Cards */}
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Goal Progress</Text>
              <Text style={s.sectionSub}>This week</Text>
            </View>
            {progress.map((p: any, idx: number) => (
              <Animated.View key={p.name} entering={FadeInDown.delay(200 + idx * 80).duration(400)}>
                <View style={[s.progressCard, Shadow.sm]}>
                  <View style={s.progressHeader}>
                    <View style={[s.progressIcon, { backgroundColor: getProgressColor(p.percent) + '15' }]}>
                      <Ionicons name={(p.icon || 'ellipse') as any} size={22} color={getProgressColor(p.percent)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.progressName}>{p.name}</Text>
                      <Text style={s.progressStat}>{p.current?.toLocaleString()} / {p.target?.toLocaleString()} {p.unit}</Text>
                    </View>
                    <Text style={[s.progressPercent, { color: getProgressColor(p.percent) }]}>{p.percent}%</Text>
                  </View>
                  <View style={s.progressBarOuter}>
                    <Animated.View style={[s.progressBarInner, { width: `${p.percent}%` as any, backgroundColor: getProgressColor(p.percent) }]} />
                  </View>
                  {p.streak > 0 && (
                    <View style={s.streakRow}>
                      <Ionicons name="flame" size={14} color={Colors.nutritionOrange} />
                      <Text style={s.streakText}>{p.streak} day streak!</Text>
                    </View>
                  )}
                  {/* Milestone badges */}
                  <View style={s.milestoneRow}>
                    {[25, 50, 75, 100].map(m => (
                      <View key={m} style={[s.milestone, p.percent >= m && s.milestoneAchieved]}>
                        <Text style={[s.milestoneText, p.percent >= m && s.milestoneTextAchieved]}>{m}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            ))}

            {/* Health Questionnaire */}
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Health Profile</Text>
            </View>
            <View style={[s.questionnaireCard, Shadow.sm]}>
              {renderQField('Favorite Fast Food', questionnaire.favorite_fast_food || 'Not set')}
              {renderQField('Dietary Restriction', questionnaire.dietary_restriction ? 'Yes' : 'No')}
              {renderQField('Under Nutritionist', questionnaire.under_nutritionist ? 'Yes' : 'No')}
              {renderQField('Lifestyle Busyness', `${questionnaire.lifestyle_busyness || 3}/5`)}
              {renderQField('Sleep Hours', `${questionnaire.sleep_hours || 7} hours`)}
              {renderQField('Workout Plan', questionnaire.current_workout_plan || 'Not set')}
              {renderQField('Best Meal', questionnaire.best_meal || 'Not set')}
            </View>
          </>
        )}
      </ScrollView>

      {/* Happiness Modal */}
      <Modal visible={showHappinessModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>How are you feeling today?</Text>
            <View style={s.emojiRow}>
              {EMOJI_FACES.map((emoji, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setHappinessLevel(idx + 1)}
                  style={[s.emojiBtn, happinessLevel === idx + 1 && s.emojiBtnActive]}
                >
                  <Text style={s.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.happinessInput}
              placeholder="Add a note (optional)"
              placeholderTextColor={Colors.textTertiary}
              value={happinessNote}
              onChangeText={setHappinessNote}
              multiline
            />
            <TouchableOpacity onPress={saveHappiness} style={s.modalSaveBtn}>
              <Text style={s.modalSaveBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHappinessModal(false)} style={s.modalCancelBtn}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Goals Modal */}
      <Modal visible={showEditGoals} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Edit Life Goals</Text>
            <Text style={s.goalsSubtext}>Select at least one goal</Text>
            {LIFE_GOAL_OPTIONS.map(g => (
              <TouchableOpacity
                key={g.name}
                style={[s.goalToggleCard, selectedGoals.includes(g.name) && s.goalToggleActive]}
                onPress={() => toggleLifeGoal(g.name)}
              >
                <Ionicons name={g.icon as any} size={22} color={selectedGoals.includes(g.name) ? Colors.green : Colors.textTertiary} />
                <Text style={[s.goalToggleText, selectedGoals.includes(g.name) && s.goalToggleTextActive]}>{g.name}</Text>
                <View style={[s.goalToggleSwitch, selectedGoals.includes(g.name) && s.goalToggleSwitchActive]}>
                  <View style={[s.goalToggleDot, selectedGoals.includes(g.name) && s.goalToggleDotActive]} />
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={saveGoals} style={s.modalSaveBtn}>
              <Text style={s.modalSaveBtnText}>Save Goals</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEditGoals(false)} style={s.modalCancelBtn}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function renderQField(label: string, value: string) {
  return (
    <View style={s.qField}>
      <Text style={s.qLabel}>{label}</Text>
      <Text style={s.qValue}>{value}</Text>
    </View>
  );
}

function getProgressColor(percent: number) {
  if (percent >= 75) return Colors.green;
  if (percent >= 50) return Colors.nutritionOrange;
  if (percent >= 25) return Colors.waterBlue;
  return Colors.textTertiary;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  loadWrap: { paddingVertical: 80, alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  title: { fontSize: FontSize.h2, fontWeight: '800', color: Colors.textPrimary },
  editBtn: { fontSize: FontSize.small, color: Colors.green, fontWeight: '600' },

  // Life goal pills
  pillScroll: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: 8 },
  goalPill: { backgroundColor: Colors.greenLight, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.green },
  goalPillText: { color: Colors.green, fontWeight: '700', fontSize: FontSize.small },
  addGoalPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.borderLight },
  addGoalText: { color: Colors.green, fontWeight: '600', fontSize: FontSize.small },

  // Happiness gauge
  happinessCard: { marginHorizontal: Spacing.lg, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16, marginBottom: Spacing.md },
  happinessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  happinessTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  happinessGauge: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  gaugeOuter: { flex: 1, height: 12, backgroundColor: Colors.borderLight, borderRadius: 6, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 6 },
  gaugePercent: { fontSize: 20, fontWeight: '800' },
  happinessHint: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 8 },

  // Section
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  sectionSub: { fontSize: FontSize.small, color: Colors.textTertiary },

  // Progress card
  progressCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  progressIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  progressStat: { fontSize: FontSize.caption, color: Colors.textTertiary },
  progressPercent: { fontSize: 18, fontWeight: '800' },
  progressBarOuter: { height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  progressBarInner: { height: '100%', borderRadius: 4 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  streakText: { fontSize: FontSize.caption, color: Colors.nutritionOrange, fontWeight: '600' },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  milestone: { backgroundColor: Colors.borderLight, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  milestoneAchieved: { backgroundColor: Colors.greenLight },
  milestoneText: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary },
  milestoneTextAchieved: { color: Colors.green },

  // Questionnaire
  questionnaireCard: { marginHorizontal: Spacing.lg, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16, marginBottom: Spacing.lg },
  qField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  qLabel: { fontSize: FontSize.small, color: Colors.textSecondary, flex: 1 },
  qValue: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textPrimary },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  modalSaveBtn: { backgroundColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md },
  modalSaveBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  modalCancelText: { color: Colors.textTertiary, fontSize: FontSize.body },

  // Happiness modal
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: Spacing.md },
  emojiBtn: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  emojiText: { fontSize: 28 },
  happinessInput: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 16, fontSize: FontSize.body, color: Colors.textPrimary, minHeight: 60 },

  // Edit Goals modal
  goalsSubtext: { fontSize: FontSize.small, color: Colors.textTertiary, marginBottom: Spacing.md },
  goalToggleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.borderLight, marginBottom: 8 },
  goalToggleActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  goalToggleText: { flex: 1, fontSize: FontSize.body, fontWeight: '600', color: Colors.textSecondary },
  goalToggleTextActive: { color: Colors.green },
  goalToggleSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.borderLight, justifyContent: 'center', paddingHorizontal: 2 },
  goalToggleSwitchActive: { backgroundColor: Colors.green },
  goalToggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  goalToggleDotActive: { alignSelf: 'flex-end' },
});
