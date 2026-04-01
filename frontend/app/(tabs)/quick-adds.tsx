import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, RefreshControl, Alert, Modal,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn, FadeInUp, FadeOut, SlideInDown, SlideOutDown,
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, Easing, interpolate, withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ZONES = [
  { key: 'meals', icon: 'restaurant', label: 'Quick Add' },
  { key: 'workouts', icon: 'barbell', label: 'Workouts' },
  { key: 'journal', icon: 'book', label: 'Journal' },
  { key: 'trackers', icon: 'notifications', label: 'Trackers' },
  { key: 'calendar', icon: 'time', label: 'Timeline' },
];

const MEAL_SLOTS = [
  { type: 'breakfast', icon: 'sunny', label: 'Breakfast', time: '7:00 - 9:00 AM', color: '#FFB74D' },
  { type: 'lunch', icon: 'restaurant', label: 'Lunch', time: '12:00 - 2:00 PM', color: '#4CAF50' },
  { type: 'dinner', icon: 'moon', label: 'Dinner', time: '6:00 - 8:00 PM', color: '#5C6BC0' },
  { type: 'snack', icon: 'cafe', label: 'Snack', time: 'Anytime', color: '#AB47BC' },
];

const MET_ACTIVITIES = [
  { name: 'Walking', value: 3.5 },
  { name: 'Cycling', value: 7.0 },
  { name: 'Swimming', value: 8.0 },
  { name: 'Running', value: 9.8 },
  { name: 'Yoga', value: 3.0 },
  { name: 'Strength', value: 6.0 },
];

// ============ ANIMATED WATER RING COMPONENT ============
function AnimatedWaterRing({ current, goal }: { current: number; goal: number }) {
  const fillLevel = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const countScale = useSharedValue(1);
  const prevCurrent = useRef(current);

  useEffect(() => {
    const pct = Math.min(1, current / goal);
    fillLevel.value = withTiming(pct, { duration: 800, easing: Easing.out(Easing.cubic) });

    // Gentle wave
    wave1.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
    wave2.value = withRepeat(
      withTiming(1, { duration: 3800, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, []);

  useEffect(() => {
    if (current !== prevCurrent.current) {
      const pct = Math.min(1, current / goal);
      fillLevel.value = withTiming(pct, { duration: 600, easing: Easing.out(Easing.cubic) });

      // Gentle scale on count change - no bounce
      countScale.value = withSequence(
        withTiming(1.08, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) })
      );

      prevCurrent.current = current;
    }
  }, [current]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${fillLevel.value * 100}%`,
    transform: [{ translateY: interpolate(wave1.value, [0, 1], [1, -1]) }],
  }));

  const wave1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(wave1.value, [0, 1], [-6, 6]) },
      { translateY: interpolate(wave1.value, [0, 1], [1, -1]) },
    ],
    opacity: 0.4,
  }));

  const wave2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(wave2.value, [0, 1], [4, -4]) },
      { translateY: interpolate(wave2.value, [0, 1], [-1, 1]) },
    ],
    opacity: 0.25,
  }));

  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }));

  const reached = current >= goal;

  return (
    <View style={ws.ringOuter}>
      <View style={ws.ringContainer}>
        {/* Water fill */}
        <Animated.View style={[ws.waterFill, fillStyle]}>
          <Animated.View style={[ws.wave, wave1Style]} />
          <Animated.View style={[ws.wave, ws.wave2, wave2Style]} />
        </Animated.View>

        {/* Center text */}
        <View style={ws.centerContent}>
          <Animated.View style={countStyle}>
            <Text style={[ws.countText, reached && ws.countReached]}>{current}</Text>
          </Animated.View>
          <Text style={ws.goalText}>of {goal}</Text>
        </View>
      </View>

      {/* Decorative droplets */}
      {reached && (
        <Animated.View entering={FadeIn.duration(600)} style={ws.celebrationBadge}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
        </Animated.View>
      )}
    </View>
  );
}

const ws = StyleSheet.create({
  ringOuter: { position: 'relative' },
  ringContainer: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#EBF5FF',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 3, borderColor: '#B3D9FF',
  },
  waterFill: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#4DA8FF',
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
  },
  wave: {
    position: 'absolute', top: -6, left: -10, right: -10,
    height: 14, backgroundColor: '#6BB8FF',
    borderRadius: 999,
  },
  wave2: { top: -3, backgroundColor: '#8EC8FF' },
  splashRipple: {
    position: 'absolute', top: '30%', left: '30%',
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: '#4DA8FF',
  },
  centerContent: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  countText: { fontSize: 30, fontWeight: '800', color: Colors.waterBlue },
  countReached: { color: Colors.green },
  goalText: { fontSize: 11, color: '#6B7C93', marginTop: -2 },
  celebrationBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#FFF', borderRadius: 12,
  },
});

// ============ ANIMATED PROGRESS RING ============
function AnimatedProgressBar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(200, withTiming(Math.min(1, value / max), { duration: 600, easing: Easing.out(Easing.cubic) }));
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

// ============ MODAL WRAPPER WITH KEYBOARD HANDLING ============
function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={ms.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={ms.backdrop} />
        </TouchableWithoutFeedback>
        <View style={ms.sheet}>
          <View style={ms.handle} />
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={ms.sheetContent}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>{children}</View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
});

// ============ MAIN SCREEN ============
export default function QuickAddsScreen() {
  const { user } = useAuth();
  const [activeZone, setActiveZone] = useState('meals');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Meal
  const [mealLogs, setMealLogs] = useState<any[]>([]);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');

  // Water
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterGoal] = useState(8);

  // Sleep
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [sleepHours, setSleepHours] = useState('7');
  const [sleepMinutes, setSleepMinutes] = useState('30');
  const [sleepQuality, setSleepQuality] = useState(3);

  // Walking
  const [walkLogs, setWalkLogs] = useState<any[]>([]);
  const [showWalkModal, setShowWalkModal] = useState(false);
  const [walkSteps, setWalkSteps] = useState('');
  const [walkDuration, setWalkDuration] = useState('');

  // Workouts
  const [workoutList, setWorkoutList] = useState<any[]>([]);
  const [workoutSummary, setWorkoutSummary] = useState<any>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [wkType, setWkType] = useState('running');
  const [wkDuration, setWkDuration] = useState('');
  const [wkIntensity, setWkIntensity] = useState('medium');
  const [wkCalories, setWkCalories] = useState('');
  const [wkNotes, setWkNotes] = useState('');

  // MET
  const [metLogs, setMetLogs] = useState<any[]>([]);
  const [showMetModal, setShowMetModal] = useState(false);
  const [metActivity, setMetActivity] = useState(MET_ACTIVITIES[0]);
  const [metDuration, setMetDuration] = useState('');

  // Journal
  const [journals, setJournals] = useState<any[]>([]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalDesc, setJournalDesc] = useState('');
  const [editingJournal, setEditingJournal] = useState<any>(null);
  const [journalSearch, setJournalSearch] = useState('');

  // Timeline & Calendar
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [calendarMode, setCalendarMode] = useState<'calendar' | 'timeline'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activityDates, setActivityDates] = useState<Record<string, string[]>>({});

  // Refs for focusing next input
  const calInputRef = useRef<TextInput>(null);
  const journalDescRef = useRef<TextInput>(null);
  const walkDurRef = useRef<TextInput>(null);

  useFocusEffect(useCallback(() => { loadAllData(); }, []));

  const loadAllData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [mealsRes, waterRes, sleepRes, walkRes, metRes, journalRes, timelineRes, summaryRes] = await Promise.all([
        api.get(`/v1/meals/log?date=${today}`).catch(() => ({ data: { logs: [] } })),
        api.get(`/v1/trackers/water?date=${today}`).catch(() => ({ data: { logs: [] } })),
        api.get('/v1/trackers/sleep').catch(() => ({ data: { logs: [] } })),
        api.get('/v1/trackers/walking').catch(() => ({ data: { logs: [] } })),
        api.get('/v1/trackers/met').catch(() => ({ data: { logs: [] } })),
        api.get('/v1/journal?limit=30').catch(() => ({ data: { data: [] } })),
        api.get(`/v1/trackers/timeline?date=${selectedDate}`).catch(() => ({ data: { events: [] } })),
        api.get(`/v1/trackers/summary?date=${today}`).catch(() => ({ data: {} })),
      ]);
      setMealLogs(mealsRes.data.logs || []);
      const wLogs = waterRes.data.logs || [];
      setWaterTotal(wLogs.reduce((s: number, w: any) => s + (w.glasses || 0), 0));
      setSleepLogs(sleepRes.data.logs || []);
      setWalkLogs(walkRes.data.logs || []);
      setMetLogs(metRes.data.logs || []);
      setJournals(journalRes.data.data || []);
      setTimelineEvents(timelineRes.data.events || []);
      // Load workouts
      try {
        const wkRes = await api.get('/v1/workouts?limit=10');
        setWorkoutList(wkRes.data.data || []);
        setWorkoutSummary(wkRes.data.summary || null);
      } catch {}

      // Build activity dates map from all logs
      const datesMap: Record<string, string[]> = {};
      for (const m of mealsRes.data.logs || []) {
        const d = m.date;
        if (d) { datesMap[d] = [...(datesMap[d] || []), 'meal']; }
      }
      for (const w of wLogs) {
        const d = w.date;
        if (d && !datesMap[d]?.includes('water')) { datesMap[d] = [...(datesMap[d] || []), 'water']; }
      }
      for (const sl of sleepRes.data.logs || []) {
        const d = sl.date;
        if (d && !datesMap[d]?.includes('sleep')) { datesMap[d] = [...(datesMap[d] || []), 'sleep']; }
      }
      for (const w of walkRes.data.logs || []) {
        const d = w.date;
        if (d && !datesMap[d]?.includes('walk')) { datesMap[d] = [...(datesMap[d] || []), 'walk']; }
      }
      for (const m of metRes.data.logs || []) {
        const d = m.date;
        if (d && !datesMap[d]?.includes('met')) { datesMap[d] = [...(datesMap[d] || []), 'met']; }
      }
      setActivityDates(datesMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadTimelineForDate = async (dateStr: string) => {
    setSelectedDate(dateStr);
    try {
      const { data } = await api.get(`/v1/trackers/timeline?date=${dateStr}`);
      setTimelineEvents(data.events || []);
    } catch (e) { console.error(e); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadAllData(); setRefreshing(false); };

  // ===== MEAL =====
  const openMealSlot = (slot: any) => { setSelectedSlot(slot); setMealName(''); setMealCalories(''); setShowMealModal(true); };
  const saveMeal = async () => {
    if (!mealName.trim()) return;
    try {
      await api.post('/v1/meals/log', { meal_type: selectedSlot.type, name: mealName.trim(), calories: parseInt(mealCalories) || 0 });
      setShowMealModal(false);
      Keyboard.dismiss();
      loadAllData();
    } catch (e) { console.error(e); }
  };
  const deleteMeal = (id: string) => Alert.alert('Delete Meal', 'Remove this meal log?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/v1/meals/log/${id}`); loadAllData(); } catch (e) { console.error(e); } }},
  ]);
  const getMealForSlot = (type: string) => mealLogs.filter(m => m.meal_type === type);

  // ===== WATER =====
  const addWater = async () => {
    try {
      const { data } = await api.post('/v1/trackers/water', { glasses: 1 });
      setWaterTotal(data.dailyTotal || waterTotal + 1);
    } catch (e) { console.error(e); }
  };

  // ===== SLEEP =====
  const saveSleep = async () => {
    const totalMins = (parseInt(sleepHours) || 0) * 60 + (parseInt(sleepMinutes) || 0);
    const now = new Date();
    const bedtime = new Date(now.getTime() - totalMins * 60000).toISOString();
    try {
      await api.post('/v1/trackers/sleep', { bedtime, wake_time: now.toISOString(), duration: totalMins, quality: sleepQuality });
      setShowSleepModal(false);
      Keyboard.dismiss();
      loadAllData();
    } catch (e) { console.error(e); }
  };

  // ===== WALKING =====
  const saveWalk = async () => {
    const steps = parseInt(walkSteps) || 0;
    if (steps <= 0) return;
    try {
      await api.post('/v1/trackers/walking', { steps, duration: parseInt(walkDuration) || 0 });
      setShowWalkModal(false); setWalkSteps(''); setWalkDuration('');
      Keyboard.dismiss();
      loadAllData();
    } catch (e) { console.error(e); }
  };

  // ===== MET =====
  const saveMet = async () => {
    const dur = parseInt(metDuration) || 0;
    if (dur <= 0) return;
    try {
      await api.post('/v1/trackers/met', { activity_type: metActivity.name, met_value: metActivity.value, duration: dur, met_minutes: metActivity.value * dur });
      setShowMetModal(false); setMetDuration('');
      Keyboard.dismiss();
      loadAllData();
    } catch (e) { console.error(e); }
  };

  // ===== JOURNAL =====
  const openNewJournal = () => { setEditingJournal(null); setJournalTitle(''); setJournalDesc(''); setShowJournalModal(true); };
  const openEditJournal = (j: any) => { setEditingJournal(j); setJournalTitle(j.title); setJournalDesc(j.description); setShowJournalModal(true); };
  const saveJournal = async () => {
    if (!journalTitle.trim() || journalTitle.trim().length < 3) return;
    try {
      if (editingJournal) {
        await api.put(`/v1/journal/${editingJournal.id}`, { title: journalTitle.trim(), description: journalDesc.trim() });
      } else {
        await api.post('/v1/journal', { title: journalTitle.trim(), description: journalDesc.trim() });
      }
      setShowJournalModal(false); setJournalTitle(''); setJournalDesc('');
      Keyboard.dismiss();
      loadAllData();
    } catch (e) { console.error(e); }
  };
  const deleteJournal = (id: string) => Alert.alert('Delete Entry', 'Delete this journal entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/v1/journal/${id}`); loadAllData(); } catch (e) { console.error(e); } }},
  ]);
  const toggleLike = async (id: string) => { try { await api.post('/v1/journal/like', { journal_id: id }); loadAllData(); } catch (e) { console.error(e); } };

  const totalCalories = mealLogs.reduce((s, m) => s + (m.calories || 0), 0);
  const calorieGoal = 2000;
  const totalStepsWeek = walkLogs.reduce((t: number, w: any) => t + (w.steps || 0), 0);
  const totalMetWeek = metLogs.reduce((t: number, m: any) => t + (m.met_minutes || 0), 0);

  const filteredJournals = journalSearch
    ? journals.filter((j: any) => j.title?.toLowerCase().includes(journalSearch.toLowerCase()) || j.description?.toLowerCase().includes(journalSearch.toLowerCase()))
    : journals;

  // ============ WORKOUT HANDLERS ============
  const WK_TYPES = [
    { key: 'walking', icon: 'walk-outline', label: 'Walking', color: Colors.green },
    { key: 'running', icon: 'fitness-outline', label: 'Running', color: '#E53E3E' },
    { key: 'cycling', icon: 'bicycle-outline', label: 'Cycling', color: Colors.waterBlue },
    { key: 'swimming', icon: 'water-outline', label: 'Swimming', color: '#00BCD4' },
    { key: 'yoga', icon: 'body-outline', label: 'Yoga', color: Colors.fitnessPurple },
    { key: 'strength', icon: 'barbell-outline', label: 'Strength', color: Colors.nutritionOrange },
    { key: 'hiit', icon: 'flash-outline', label: 'HIIT', color: '#FF5252' },
    { key: 'custom', icon: 'ellipsis-horizontal-outline', label: 'Custom', color: Colors.textTertiary },
  ];

  const handleCreateWorkout = async () => {
    if (!wkDuration || parseInt(wkDuration) <= 0) { Alert.alert('Error', 'Duration required'); return; }
    try {
      await api.post('/v1/workouts', {
        type: wkType, duration: parseInt(wkDuration), intensity: wkIntensity,
        calories: wkCalories ? parseInt(wkCalories) : undefined, notes: wkNotes || undefined,
      });
      setShowWorkoutModal(false);
      setWkType('running'); setWkDuration(''); setWkIntensity('medium'); setWkCalories(''); setWkNotes('');
      loadAllData();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
  };

  const deleteWorkout = async (id: string) => {
    Alert.alert('Delete Workout', 'Remove this workout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/v1/workouts/${id}`); loadAllData(); } catch (e) { console.error(e); } }},
    ]);
  };

  const renderWorkouts = () => (
    <View>
      {/* Weekly Summary */}
      {workoutSummary && (
        <Animated.View entering={FadeInDown.duration(350)} style={[s.summaryCard, Shadow.sm]}>
          <Text style={s.sectionTitle}>This Week</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm }}>
            {[
              { val: workoutSummary.totalWorkouts || 0, label: 'Workouts', color: Colors.green },
              { val: workoutSummary.totalDuration || 0, label: 'Minutes', color: Colors.waterBlue },
              { val: workoutSummary.totalCalories || 0, label: 'Calories', color: Colors.nutritionOrange },
            ].map((s2, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: s2.color }}>{s2.val}</Text>
                <Text style={{ fontSize: 11, color: Colors.textTertiary, marginTop: 2 }}>{s2.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Log Button */}
      <TouchableOpacity
        style={[s.addWorkoutBtn, Shadow.sm]}
        onPress={() => setShowWorkoutModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={24} color={Colors.green} />
        <Text style={s.addWorkoutText}>Log a Workout</Text>
      </TouchableOpacity>

      {/* Recent workouts */}
      <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>Recent Workouts</Text>
      {workoutList.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="barbell-outline" size={36} color={Colors.textTertiary} />
          <Text style={s.emptyText}>No workouts logged yet</Text>
        </View>
      ) : (
        workoutList.slice(0, 5).map((w: any, i: number) => {
          const wkCfg = WK_TYPES.find(t => t.key === w.type) || WK_TYPES[7];
          return (
            <Animated.View key={w.id || i} entering={FadeInDown.delay(i * 50).duration(350)}>
              <TouchableOpacity style={[s.workoutCard, Shadow.sm]} onLongPress={() => deleteWorkout(w.id)} activeOpacity={0.85}>
                <View style={[s.workoutIcon, { backgroundColor: wkCfg.color + '15' }]}>
                  <Ionicons name={wkCfg.icon as any} size={24} color={wkCfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.workoutType}>{wkCfg.label}</Text>
                  <Text style={s.workoutMeta}>
                    {w.duration_minutes}min · {w.intensity} · {w.calories_burned} cal
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteWorkout(w.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle-outline" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          );
        })
      )}
    </View>
  );

  // ============ RENDER ZONES ============
  const renderMeals = () => (
    <View>
      {/* Calorie summary */}
      <Animated.View entering={FadeInDown.delay(0).duration(500)}>
        <View style={[s.calorieBar, Shadow.sm]}>
          <View style={s.calorieInfo}>
            <Ionicons name="flame" size={18} color={Colors.nutritionOrange} />
            <Text style={s.calorieText}>{totalCalories} cal</Text>
          </View>
          <AnimatedProgressBar value={totalCalories} max={calorieGoal} color={Colors.nutritionOrange} height={6} />
          <Text style={s.calorieGoal}>Goal: {calorieGoal.toLocaleString()}</Text>
        </View>
      </Animated.View>

      {MEAL_SLOTS.map((slot, idx) => {
        const meals = getMealForSlot(slot.type);
        return (
          <Animated.View key={slot.type} entering={FadeInDown.delay(80 + idx * 100).duration(350)}>
            <View style={[s.mealCard, Shadow.sm]}>
              <View style={s.mealCardHeader}>
                <View style={[s.mealIcon, { backgroundColor: slot.color + '15' }]}>
                  <Ionicons name={slot.icon as any} size={22} color={slot.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.mealLabel}>{slot.label}</Text>
                  <Text style={s.mealTime}>{slot.time}</Text>
                </View>
                <TouchableOpacity onPress={() => openMealSlot(slot)} style={s.addMealBtn} activeOpacity={0.7}>
                  <Ionicons name="add-circle" size={30} color={Colors.green} />
                </TouchableOpacity>
              </View>
              {meals.length === 0 ? (
                <TouchableOpacity onPress={() => openMealSlot(slot)} style={s.tapToAdd} activeOpacity={0.6}>
                  <Text style={s.tapToAddText}>Tap to add</Text>
                </TouchableOpacity>
              ) : (
                meals.map((m: any, mi: number) => (
                  <Animated.View key={m.id} entering={FadeIn.delay(mi * 60)}>
                    <View style={s.loggedMeal}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.loggedMealName}>{m.manual_name || m.name || 'Meal'}</Text>
                        {(m.calories || 0) > 0 && (
                          <View style={s.calBadge}>
                            <Ionicons name="flame-outline" size={12} color={Colors.nutritionOrange} />
                            <Text style={s.calBadgeText}>{m.calories} cal</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => deleteMeal(m.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                ))
              )}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );

  const renderTrackers = () => (
    <View>
      {/* Water Tracker */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)}>
        <View style={[s.trackerCard, Shadow.sm]}>
          <View style={s.trackerHeader}>
            <Ionicons name="water" size={22} color={Colors.waterBlue} />
            <Text style={s.trackerTitle}>Water Intake</Text>
            <View style={s.trackerBadge}>
              <Text style={s.trackerBadgeText}>{waterTotal >= waterGoal ? 'Done!' : `${waterGoal - waterTotal} left`}</Text>
            </View>
          </View>
          <View style={s.waterTracker}>
            <AnimatedWaterRing current={waterTotal} goal={waterGoal} />
            <View style={s.waterActions}>
              <Text style={s.waterStatus}>
                {waterTotal >= waterGoal ? 'Great job! Goal reached!' : `Drink ${waterGoal - waterTotal} more glasses`}
              </Text>
              <View style={s.waterBtns}>
                <TouchableOpacity onPress={addWater} style={[s.waterAddBtn, Shadow.sm]} activeOpacity={0.8}>
                  <Ionicons name="add" size={22} color="#FFF" />
                  <Text style={s.waterAddText}>Add Glass</Text>
                </TouchableOpacity>
              </View>
              {/* Mini history */}
              <View style={s.waterGlassRow}>
                {Array.from({ length: waterGoal }).map((_, i) => (
                  <Animated.View key={i} entering={FadeIn.delay(i * 50)}>
                    <Ionicons
                      name={i < waterTotal ? "water" : "water-outline"}
                      size={16}
                      color={i < waterTotal ? Colors.waterBlue : '#D1D5DB'}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Sleep */}
      <Animated.View entering={FadeInDown.delay(120).duration(350)}>
        <View style={[s.trackerCard, Shadow.sm]}>
          <View style={s.trackerHeader}>
            <Ionicons name="moon" size={22} color={Colors.fitnessPurple} />
            <Text style={s.trackerTitle}>Sleep</Text>
          </View>
          {sleepLogs.length > 0 ? (
            <View style={s.sleepInfo}>
              <View>
                <Text style={s.sleepValue}>{Math.floor((sleepLogs[0]?.duration_minutes || 0) / 60)}h {(sleepLogs[0]?.duration_minutes || 0) % 60}m</Text>
                <Text style={s.sleepLabel}>Last night</Text>
              </View>
              <View style={s.sleepQualityRow}>
                {[1,2,3,4,5].map(i => (
                  <Animated.View key={i} entering={FadeIn.delay(i * 80)}>
                    <Ionicons name={i <= (sleepLogs[0]?.quality || 0) ? "moon" : "moon-outline"} size={18} color={Colors.fitnessPurple} />
                  </Animated.View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={s.emptyTracker}>No sleep data logged yet</Text>
          )}
          <TouchableOpacity onPress={() => setShowSleepModal(true)} style={s.trackerLogBtn} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.green} />
            <Text style={s.trackerLogText}>Log Sleep</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Walking */}
      <Animated.View entering={FadeInDown.delay(240).duration(350)}>
        <View style={[s.trackerCard, Shadow.sm]}>
          <View style={s.trackerHeader}>
            <Ionicons name="walk" size={22} color={Colors.socialTeal} />
            <Text style={s.trackerTitle}>Walking</Text>
          </View>
          <View style={s.walkInfo}>
            <Text style={s.walkSteps}>{totalStepsWeek.toLocaleString()}</Text>
            <Text style={s.walkLabel}>steps this week</Text>
            <AnimatedProgressBar value={totalStepsWeek} max={70000} color={Colors.socialTeal} />
            <Text style={s.walkGoalText}>Goal: 10,000 / day (70,000 / week)</Text>
          </View>
          <TouchableOpacity onPress={() => setShowWalkModal(true)} style={s.trackerLogBtn} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.green} />
            <Text style={s.trackerLogText}>Log Walk</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* MET */}
      <Animated.View entering={FadeInDown.delay(360).duration(350)}>
        <View style={[s.trackerCard, Shadow.sm]}>
          <View style={s.trackerHeader}>
            <Ionicons name="barbell" size={22} color={Colors.danger} />
            <Text style={s.trackerTitle}>MET Tracker</Text>
          </View>
          <View style={s.metInfo}>
            <Text style={s.metTotal}>{Math.round(totalMetWeek)}</Text>
            <Text style={s.metLabel}>MET-min this week</Text>
          </View>
          <AnimatedProgressBar value={totalMetWeek} max={1000} color={Colors.danger} />
          <View style={s.metCallout}>
            <Ionicons name="information-circle" size={16} color={Colors.waterBlue} />
            <Text style={s.metCalloutText}>MET = Metabolic Equivalent. 1 MET = energy at rest.</Text>
          </View>
          <TouchableOpacity onPress={() => setShowMetModal(true)} style={s.trackerLogBtn} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.green} />
            <Text style={s.trackerLogText}>Log Activity</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );

  const renderJournal = () => (
    <View>
      <View style={s.journalHeader}>
        <Text style={s.journalHeaderTitle}>My Journal</Text>
        <TouchableOpacity onPress={openNewJournal} style={s.journalAddBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search journal entries..."
            placeholderTextColor={Colors.textTertiary}
            value={journalSearch}
            onChangeText={setJournalSearch}
          />
          {journalSearch.length > 0 && (
            <TouchableOpacity onPress={() => setJournalSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {filteredJournals.length === 0 ? (
        <Animated.View entering={FadeIn.duration(500)} style={s.emptyState}>
          <Ionicons name="book-outline" size={48} color={Colors.textTertiary} />
          <Text style={s.emptyTitle}>{journalSearch ? 'No results' : 'Start your journal'}</Text>
          <Text style={s.emptySubtext}>{journalSearch ? 'Try different keywords' : 'Tap + to write your first entry.'}</Text>
        </Animated.View>
      ) : (
        filteredJournals.map((j: any, idx: number) => (
          <Animated.View key={j.id} entering={FadeInDown.delay(idx * 60).duration(350)}>
            <TouchableOpacity style={[s.journalCard, Shadow.sm]} onPress={() => openEditJournal(j)} activeOpacity={0.85}>
              <Text style={s.journalTitle} numberOfLines={1}>{j.title}</Text>
              <Text style={s.journalPreview} numberOfLines={2}>{j.description}</Text>
              <View style={s.journalMeta}>
                <Text style={s.journalDate}>
                  {j.date === new Date().toISOString().split('T')[0] ? 'Today' : j.date}
                </Text>
                <View style={s.journalActions}>
                  <TouchableOpacity onPress={() => toggleLike(j.id)} style={s.journalAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={j.is_liked ? "heart" : "heart-outline"} size={18} color={j.is_liked ? '#FF5252' : Colors.textTertiary} />
                    <Text style={[s.journalActionText, j.is_liked && { color: '#FF5252' }]}>{j.like_count || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteJournal(j.id)} style={s.journalAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))
      )}
    </View>
  );

  const getTimelineIcon = (type: string): string => {
    const map: Record<string, string> = { meal: 'restaurant', water: 'water', sleep: 'moon', walking: 'walk', met: 'barbell', journal: 'book' };
    return map[type] || 'ellipse';
  };

  // Calendar helpers
  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const formatMonthYear = (d: Date) => d.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

  const getActivityColor = (types: string[]) => {
    if (types.includes('meal') && types.includes('water')) return Colors.green;
    if (types.includes('meal')) return Colors.nutritionOrange;
    if (types.includes('water')) return Colors.waterBlue;
    if (types.includes('walk') || types.includes('met')) return Colors.socialTeal;
    if (types.includes('sleep')) return Colors.fitnessPurple;
    return Colors.textTertiary;
  };

  const renderCalendarTimeline = () => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const today = new Date().toISOString().split('T')[0];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    return (
      <View>
        {/* Mode toggle */}
        <View style={s.modeToggle}>
          <TouchableOpacity onPress={() => setCalendarMode('calendar')} style={[s.modeBtn, calendarMode === 'calendar' && s.modeBtnActive]}>
            <Ionicons name="calendar" size={16} color={calendarMode === 'calendar' ? '#FFF' : Colors.textTertiary} />
            <Text style={[s.modeBtnText, calendarMode === 'calendar' && s.modeBtnTextActive]}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCalendarMode('timeline')} style={[s.modeBtn, calendarMode === 'timeline' && s.modeBtnActive]}>
            <Ionicons name="list" size={16} color={calendarMode === 'timeline' ? '#FFF' : Colors.textTertiary} />
            <Text style={[s.modeBtnText, calendarMode === 'timeline' && s.modeBtnTextActive]}>Timeline</Text>
          </TouchableOpacity>
        </View>

        {calendarMode === 'calendar' ? (
          <Animated.View entering={FadeIn.duration(300)}>
            {/* Month navigator */}
            <View style={s.calMonthRow}>
              <TouchableOpacity onPress={prevMonth} style={s.calNavBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.calMonthText}>{formatMonthYear(calendarMonth)}</Text>
              <TouchableOpacity onPress={nextMonth} style={s.calNavBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={s.calDayHeaders}>
              {DAYS.map(d => (
                <View key={d} style={s.calDayHeader}>
                  <Text style={s.calDayHeaderText}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={s.calGrid}>
              {calendarDays.map((day, idx) => {
                if (day === null) return <View key={`e-${idx}`} style={s.calCell} />;
                const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const activities = activityDates[dateStr] || [];
                const hasActivity = activities.length > 0;

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[s.calCell, isSelected && s.calCellSelected, isToday && !isSelected && s.calCellToday]}
                    onPress={() => loadTimelineForDate(dateStr)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.calDayText, isSelected && s.calDayTextSelected, isToday && !isSelected && s.calDayTextToday]}>{day}</Text>
                    {hasActivity && (
                      <View style={s.calDotRow}>
                        {activities.slice(0, 3).map((a: string, i: number) => (
                          <View key={i} style={[s.calDot, { backgroundColor: getActivityColor([a]) }]} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected date activity summary */}
            <View style={[s.calSummary, Shadow.sm]}>
              <Text style={s.calSummaryTitle}>
                {selectedDate === today ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              {activityDates[selectedDate] ? (
                <View style={s.calSummaryDots}>
                  {activityDates[selectedDate].map((a: string, i: number) => (
                    <View key={i} style={s.calSummaryTag}>
                      <View style={[s.calDot, { backgroundColor: getActivityColor([a]) }]} />
                      <Text style={s.calSummaryTagText}>{a.charAt(0).toUpperCase() + a.slice(1)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.calSummaryEmpty}>No activities logged</Text>
              )}
              <TouchableOpacity onPress={() => { setCalendarMode('timeline'); }} style={s.calViewTimelineBtn}>
                <Text style={s.calViewTimelineText}>View Timeline</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.green} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={s.timelineDateRow}>
              <Text style={s.timelineTitle}>
                {selectedDate === today ? "Today's Timeline" : `Timeline for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </Text>
            </View>
            {timelineEvents.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="time-outline" size={48} color={Colors.textTertiary} />
                <Text style={s.emptyTitle}>No activities</Text>
                <Text style={s.emptySubtext}>No tracker events for this date</Text>
              </View>
            ) : (
              timelineEvents.map((ev: any, idx: number) => (
                <Animated.View key={idx} entering={FadeInDown.delay(idx * 60).duration(350)}>
                  <View style={s.timelineItem}>
                    <View style={s.timelineLeft}>
                      <Text style={s.timelineTime}>
                        {ev.time ? new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </Text>
                    </View>
                    <View style={s.timelineLine}>
                      <View style={[s.timelineDot, { backgroundColor: ev.color || Colors.green }]} />
                      {idx < timelineEvents.length - 1 && <View style={s.timelineConnector} />}
                    </View>
                    <View style={[s.timelineCard, Shadow.sm]}>
                      <View style={[s.timelineIconWrap, { backgroundColor: (ev.color || Colors.green) + '15' }]}>
                        <Ionicons name={getTimelineIcon(ev.type) as any} size={18} color={ev.color || Colors.green} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.timelineCardTitle}>{ev.title}</Text>
                        <Text style={s.timelineCardDesc}>{ev.description}</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))
            )}
          </Animated.View>
        )}
      </View>
    );
  };

  // Zone indicator animation
  const zoneUnderline = useSharedValue(0);
  const handleZoneChange = (key: string) => {
    const idx = ZONES.findIndex(z => z.key === key);
    zoneUnderline.value = withTiming(idx, { duration: 250, easing: Easing.out(Easing.quad) });
    setActiveZone(key);
  };

  const underlineStyle = useAnimatedStyle(() => ({
    left: (SCREEN_WIDTH / 5) * zoneUnderline.value + (SCREEN_WIDTH / 5 - 30) / 2,
  }));

  return (
    <SafeAreaView style={s.safe}>
      {/* Zone icon bar */}
      <View style={s.zoneBar}>
        {ZONES.map((z, i) => (
          <TouchableOpacity
            key={z.key}
            style={s.zoneBtn}
            onPress={() => handleZoneChange(z.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={(activeZone === z.key ? z.icon : `${z.icon}-outline`) as any}
              size={22}
              color={activeZone === z.key ? Colors.green : Colors.textTertiary}
            />
            <Text style={[s.zoneBtnText, activeZone === z.key && s.zoneBtnTextActive]}>{z.label}</Text>
          </TouchableOpacity>
        ))}
        <Animated.View style={[s.zoneIndicator, underlineStyle]} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        {loading ? (
          <View style={s.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
        ) : (
          <>
            {activeZone === 'meals' && renderMeals()}
            {activeZone === 'workouts' && renderWorkouts()}
            {activeZone === 'trackers' && renderTrackers()}
            {activeZone === 'journal' && renderJournal()}
            {activeZone === 'calendar' && renderCalendarTimeline()}
          </>
        )}
      </ScrollView>

      {/* ===== MODALS ===== */}

      {/* Meal Modal */}
      <BottomSheet visible={showMealModal} onClose={() => { setShowMealModal(false); Keyboard.dismiss(); }}>
        <Text style={s.modalTitle}>Add {selectedSlot?.label || 'Meal'}</Text>
        <Text style={s.inputLabel}>What did you eat?</Text>
        <TextInput
          style={s.modalInput}
          placeholder="e.g. Grilled chicken salad"
          placeholderTextColor={Colors.textTertiary}
          value={mealName}
          onChangeText={setMealName}
          returnKeyType="next"
          onSubmitEditing={() => calInputRef.current?.focus()}
          autoFocus
        />
        <Text style={s.inputLabel}>Estimated calories (optional)</Text>
        <TextInput
          ref={calInputRef}
          style={s.modalInput}
          placeholder="e.g. 350"
          placeholderTextColor={Colors.textTertiary}
          value={mealCalories}
          onChangeText={setMealCalories}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={saveMeal}
        />
        <TouchableOpacity onPress={saveMeal} style={[s.modalSaveBtn, !mealName.trim() && s.modalSaveBtnDisabled]} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>Save Meal</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowMealModal(false); Keyboard.dismiss(); }} style={s.modalCancelBtn}>
          <Text style={s.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Sleep Modal */}
      <BottomSheet visible={showSleepModal} onClose={() => { setShowSleepModal(false); Keyboard.dismiss(); }}>
        <Text style={s.modalTitle}>Log Sleep</Text>
        <View style={s.sleepInputRow}>
          <View style={s.sleepInputWrap}>
            <Text style={s.inputLabel}>Hours</Text>
            <TextInput style={s.modalInput} value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" placeholder="7" placeholderTextColor={Colors.textTertiary} />
          </View>
          <View style={s.sleepInputWrap}>
            <Text style={s.inputLabel}>Minutes</Text>
            <TextInput style={s.modalInput} value={sleepMinutes} onChangeText={setSleepMinutes} keyboardType="numeric" placeholder="30" placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>
        <Text style={s.inputLabel}>Sleep Quality</Text>
        <View style={s.qualityRow}>
          {[1,2,3,4,5].map(q => (
            <TouchableOpacity key={q} onPress={() => setSleepQuality(q)} style={[s.qualityBtn, q <= sleepQuality && s.qualityBtnActive]}>
              <Ionicons name={q <= sleepQuality ? "moon" : "moon-outline"} size={26} color={q <= sleepQuality ? Colors.fitnessPurple : '#CCC'} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={saveSleep} style={s.modalSaveBtn} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>Save Sleep</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowSleepModal(false); Keyboard.dismiss(); }} style={s.modalCancelBtn}>
          <Text style={s.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Walking Modal */}
      <BottomSheet visible={showWalkModal} onClose={() => { setShowWalkModal(false); Keyboard.dismiss(); }}>
        <Text style={s.modalTitle}>Log Walk</Text>
        <Text style={s.inputLabel}>Steps</Text>
        <TextInput
          style={s.modalInput}
          placeholder="e.g. 5000"
          placeholderTextColor={Colors.textTertiary}
          value={walkSteps}
          onChangeText={setWalkSteps}
          keyboardType="numeric"
          returnKeyType="next"
          onSubmitEditing={() => walkDurRef.current?.focus()}
          autoFocus
        />
        <Text style={s.inputLabel}>Duration (minutes, optional)</Text>
        <TextInput
          ref={walkDurRef}
          style={s.modalInput}
          placeholder="e.g. 45"
          placeholderTextColor={Colors.textTertiary}
          value={walkDuration}
          onChangeText={setWalkDuration}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={saveWalk}
        />
        {walkSteps ? (
          <Animated.View entering={FadeIn.duration(300)} style={s.calcRow}>
            <View style={s.calcItem}>
              <Ionicons name="navigate" size={14} color={Colors.socialTeal} />
              <Text style={s.calcText}>{(parseInt(walkSteps) * 0.0008).toFixed(2)} km</Text>
            </View>
            <View style={s.calcItem}>
              <Ionicons name="flame" size={14} color={Colors.nutritionOrange} />
              <Text style={s.calcText}>{Math.round(parseInt(walkSteps) * 0.04)} kcal</Text>
            </View>
          </Animated.View>
        ) : null}
        <TouchableOpacity onPress={saveWalk} style={[s.modalSaveBtn, !walkSteps && s.modalSaveBtnDisabled]} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>Log Walk</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowWalkModal(false); Keyboard.dismiss(); }} style={s.modalCancelBtn}>
          <Text style={s.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* MET Modal */}
      <BottomSheet visible={showMetModal} onClose={() => { setShowMetModal(false); Keyboard.dismiss(); }}>
        <Text style={s.modalTitle}>Log Activity</Text>
        <Text style={s.inputLabel}>Activity Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.metActivityScroll} keyboardShouldPersistTaps="handled">
          {MET_ACTIVITIES.map(a => (
            <TouchableOpacity
              key={a.name}
              style={[s.metChip, metActivity.name === a.name && s.metChipActive]}
              onPress={() => setMetActivity(a)}
            >
              <Text style={[s.metChipText, metActivity.name === a.name && s.metChipTextActive]}>{a.name}</Text>
              <Text style={[s.metChipVal, metActivity.name === a.name && s.metChipTextActive]}>MET {a.value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={s.inputLabel}>Duration (minutes)</Text>
        <TextInput
          style={s.modalInput}
          placeholder="e.g. 30"
          placeholderTextColor={Colors.textTertiary}
          value={metDuration}
          onChangeText={setMetDuration}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={saveMet}
        />
        {metDuration ? (
          <Animated.View entering={FadeIn.duration(300)} style={s.calcRow}>
            <View style={s.calcItem}>
              <Ionicons name="barbell" size={14} color={Colors.danger} />
              <Text style={s.calcText}>{(metActivity.value * parseInt(metDuration || '0')).toFixed(0)} MET-minutes</Text>
            </View>
          </Animated.View>
        ) : null}
        <TouchableOpacity onPress={saveMet} style={[s.modalSaveBtn, !metDuration && s.modalSaveBtnDisabled]} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>Log Activity</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowMetModal(false); Keyboard.dismiss(); }} style={s.modalCancelBtn}>
          <Text style={s.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Journal Modal */}
      <BottomSheet visible={showJournalModal} onClose={() => { setShowJournalModal(false); Keyboard.dismiss(); }}>
        <Text style={s.modalTitle}>{editingJournal ? 'Edit Entry' : 'New Journal Entry'}</Text>
        <Text style={s.inputLabel}>Title</Text>
        <TextInput
          style={s.modalInput}
          placeholder="What's on your mind?"
          placeholderTextColor={Colors.textTertiary}
          value={journalTitle}
          onChangeText={setJournalTitle}
          maxLength={100}
          returnKeyType="next"
          onSubmitEditing={() => journalDescRef.current?.focus()}
          autoFocus
        />
        <Text style={s.inputLabel}>Description</Text>
        <TextInput
          ref={journalDescRef}
          style={[s.modalInput, { height: 120, textAlignVertical: 'top', paddingTop: 14 }]}
          placeholder="Write your thoughts, feelings, reflections..."
          placeholderTextColor={Colors.textTertiary}
          value={journalDesc}
          onChangeText={setJournalDesc}
          multiline
          maxLength={2000}
        />
        <Text style={s.charCount}>{journalDesc.length}/2000</Text>
        <TouchableOpacity onPress={saveJournal} style={[s.modalSaveBtn, (!journalTitle.trim() || journalTitle.trim().length < 3) && s.modalSaveBtnDisabled]} activeOpacity={0.8}>
          <Text style={s.modalSaveBtnText}>{editingJournal ? 'Update Entry' : 'Save Entry'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowJournalModal(false); Keyboard.dismiss(); }} style={s.modalCancelBtn}>
          <Text style={s.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Workout Modal */}
      <BottomSheet visible={showWorkoutModal} onClose={() => { setShowWorkoutModal(false); Keyboard.dismiss(); }}>
        <Text style={s.bsTitle}>Log Workout</Text>
        <Text style={s.bsLabel}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {WK_TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.wkTypeChip, wkType === t.key && { backgroundColor: t.color, borderColor: t.color }]}
              onPress={() => setWkType(t.key)}
            >
              <Ionicons name={t.icon as any} size={16} color={wkType === t.key ? '#FFF' : t.color} />
              <Text style={[s.wkTypeText, wkType === t.key && { color: '#FFF' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={s.bsLabel}>Duration (minutes)</Text>
        <TextInput style={s.bsInput} value={wkDuration} onChangeText={setWkDuration} keyboardType="numeric" placeholder="30" placeholderTextColor={Colors.textTertiary} />
        <Text style={s.bsLabel}>Intensity</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {['low', 'medium', 'high'].map(int => (
            <TouchableOpacity
              key={int}
              style={[s.wkIntChip, wkIntensity === int && s.wkIntChipActive]}
              onPress={() => setWkIntensity(int)}
            >
              <Text style={[s.wkIntText, wkIntensity === int && s.wkIntTextActive]}>
                {int.charAt(0).toUpperCase() + int.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.bsLabel}>Calories (optional, auto-calculated)</Text>
        <TextInput style={s.bsInput} value={wkCalories} onChangeText={setWkCalories} keyboardType="numeric" placeholder="Auto" placeholderTextColor={Colors.textTertiary} />
        <Text style={s.bsLabel}>Notes</Text>
        <TextInput style={[s.bsInput, { minHeight: 50 }]} value={wkNotes} onChangeText={setWkNotes} multiline placeholder="How did it go?" placeholderTextColor={Colors.textTertiary} />
        <TouchableOpacity onPress={handleCreateWorkout} activeOpacity={0.8}>
          <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.bsBtn}><Text style={s.bsBtnText}>Log Workout</Text></LinearGradient>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ============ STYLES ============
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flex: 1 },
  content: { paddingBottom: 100, paddingTop: 8 },
  loadWrap: { paddingVertical: 80, alignItems: 'center' },

  // Zone bar
  zoneBar: { flexDirection: 'row', paddingHorizontal: 0, paddingTop: 8, paddingBottom: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight, position: 'relative' },
  zoneBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  zoneBtnText: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary, marginTop: 4 },
  zoneBtnTextActive: { color: Colors.green, fontWeight: '700' },
  zoneIndicator: { position: 'absolute', bottom: 0, width: 30, height: 3, backgroundColor: Colors.green, borderRadius: 2 },

  // Calorie bar
  calorieBar: { marginHorizontal: Spacing.md, padding: 14, backgroundColor: '#FFF', borderRadius: Radius.lg, marginBottom: Spacing.md, gap: 8 },
  calorieInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calorieText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  calorieGoal: { fontSize: FontSize.caption, color: Colors.textTertiary, alignSelf: 'flex-end' },

  // Meal cards
  mealCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 14 },
  mealCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealLabel: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  mealTime: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  addMealBtn: { padding: 4 },
  tapToAdd: { paddingVertical: 10, paddingLeft: 58 },
  tapToAddText: { fontSize: FontSize.small, color: Colors.textTertiary, fontStyle: 'italic' },
  loggedMeal: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingLeft: 58, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 8 },
  loggedMealName: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textPrimary },
  calBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  calBadgeText: { fontSize: FontSize.caption, color: Colors.nutritionOrange, fontWeight: '600' },

  // Tracker cards
  trackerCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16 },
  trackerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  trackerTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  trackerBadge: { backgroundColor: Colors.waterBlue + '15', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  trackerBadgeText: { fontSize: FontSize.caption, color: Colors.waterBlue, fontWeight: '600' },
  emptyTracker: { fontSize: FontSize.small, color: Colors.textTertiary, fontStyle: 'italic', marginBottom: 8 },
  trackerLogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.greenLight, borderRadius: Radius.lg, paddingVertical: 12, marginTop: 10 },
  trackerLogText: { color: Colors.green, fontWeight: '700', fontSize: FontSize.small },

  // Water tracker
  waterTracker: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  waterActions: { flex: 1, gap: 10 },
  waterStatus: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20 },
  waterBtns: { flexDirection: 'row', gap: 8 },
  waterAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.waterBlue, borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 16 },
  waterAddText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.small },
  waterGlassRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },

  // Sleep
  sleepInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sleepValue: { fontSize: 24, fontWeight: '800', color: Colors.fitnessPurple },
  sleepLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  sleepQualityRow: { flexDirection: 'row', gap: 4 },

  // Walking
  walkInfo: { gap: 6 },
  walkSteps: { fontSize: 28, fontWeight: '800', color: Colors.socialTeal, textAlign: 'center' },
  walkLabel: { fontSize: FontSize.caption, color: Colors.textTertiary, textAlign: 'center' },
  walkGoalText: { fontSize: FontSize.caption, color: Colors.textTertiary, textAlign: 'center', marginTop: 2 },

  // MET
  metInfo: { alignItems: 'center', marginBottom: 8 },
  metTotal: { fontSize: 28, fontWeight: '800', color: Colors.danger },
  metLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  metCallout: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: Colors.waterBlue + '08', borderRadius: Radius.sm, marginTop: 10 },
  metCalloutText: { flex: 1, fontSize: FontSize.caption, color: Colors.waterBlue },

  // Journal
  journalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  journalHeaderTitle: { fontSize: FontSize.h3, fontWeight: '700', color: Colors.textPrimary },
  journalAddBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.borderLight },
  searchInput: { flex: 1, fontSize: FontSize.small, color: Colors.textPrimary, paddingVertical: 0 },
  journalCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 14 },
  journalTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  journalPreview: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  journalMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  journalDate: { fontSize: FontSize.caption, color: Colors.textTertiary },
  journalActions: { flexDirection: 'row', gap: 16 },
  journalAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  journalActionText: { fontSize: FontSize.caption, color: Colors.textTertiary, fontWeight: '600' },

  // Timeline
  timelineTitle: { fontSize: FontSize.h3, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  timelineItem: { flexDirection: 'row', paddingHorizontal: Spacing.md, marginBottom: 4 },
  timelineLeft: { width: 52, alignItems: 'flex-end', paddingRight: 8 },
  timelineTime: { fontSize: FontSize.caption, color: Colors.textTertiary, fontWeight: '500' },
  timelineLine: { alignItems: 'center', width: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  timelineCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: Radius.md, padding: 12, marginLeft: 8, marginBottom: 8 },
  timelineIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timelineCardTitle: { fontSize: FontSize.small, fontWeight: '700', color: Colors.textPrimary },
  timelineCardDesc: { fontSize: FontSize.caption, color: Colors.textSecondary },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: FontSize.small, color: Colors.textTertiary },

  // Modal (shared)
  modalTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4, marginTop: Spacing.sm },
  inputLabel: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },
  modalInput: { backgroundColor: '#F7F8FA', borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 16, fontSize: FontSize.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight },
  modalSaveBtn: { backgroundColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md },
  modalSaveBtnDisabled: { opacity: 0.45 },
  modalSaveBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 14 },
  modalCancelText: { color: Colors.textTertiary, fontSize: FontSize.body },
  charCount: { fontSize: FontSize.caption, color: Colors.textTertiary, textAlign: 'right', marginTop: 4 },

  // Sleep modal
  sleepInputRow: { flexDirection: 'row', gap: 12 },
  sleepInputWrap: { flex: 1 },
  qualityRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.sm, marginTop: 8, justifyContent: 'center' },
  qualityBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  qualityBtnActive: { borderColor: Colors.fitnessPurple, backgroundColor: Colors.fitnessPurple + '10' },

  // Calc row
  calcRow: { flexDirection: 'row', gap: 16, marginVertical: 8, paddingHorizontal: 4 },
  calcItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calcText: { fontSize: FontSize.small, color: Colors.textSecondary, fontWeight: '500' },

  // MET chips
  metActivityScroll: { marginBottom: 4, marginTop: 4 },
  metChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.borderLight, marginRight: 8, alignItems: 'center' },
  metChipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  metChipText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  metChipTextActive: { color: Colors.green },
  metChipVal: { fontSize: 10, color: Colors.textTertiary },

  // Calendar mode toggle
  modeToggle: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: '#F1F5F9', borderRadius: Radius.lg, padding: 3 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.md },
  modeBtnActive: { backgroundColor: Colors.green },
  modeBtnText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textTertiary },
  modeBtnTextActive: { color: '#FFF' },

  // Calendar
  calMonthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  calNavBtn: { padding: 4 },
  calMonthText: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  calDayHeaders: { flexDirection: 'row', paddingHorizontal: Spacing.md },
  calDayHeader: { flex: 1, alignItems: 'center', paddingBottom: 8 },
  calDayHeaderText: { fontSize: FontSize.caption, fontWeight: '600', color: Colors.textTertiary },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md },
  calCell: { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  calCellSelected: { backgroundColor: Colors.green },
  calCellToday: { backgroundColor: Colors.greenLight },
  calDayText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textPrimary },
  calDayTextSelected: { color: '#FFF' },
  calDayTextToday: { color: Colors.green },
  calDotRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  calDot: { width: 5, height: 5, borderRadius: 3 },
  calSummary: { marginHorizontal: Spacing.md, marginTop: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 14 },
  calSummaryTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  calSummaryDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  calSummaryTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F7F8FA', borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  calSummaryTagText: { fontSize: FontSize.caption, color: Colors.textSecondary, fontWeight: '500' },
  calSummaryEmpty: { fontSize: FontSize.small, color: Colors.textTertiary, marginTop: 6 },
  calViewTimelineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 8 },
  calViewTimelineText: { fontSize: FontSize.small, color: Colors.green, fontWeight: '700' },
  timelineDateRow: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },

  // Workout zone
  summaryCard: { marginHorizontal: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.md },
  addWorkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: Spacing.md, backgroundColor: Colors.greenLight, borderRadius: Radius.lg, paddingVertical: 14, marginBottom: Spacing.sm },
  addWorkoutText: { color: Colors.green, fontWeight: '700', fontSize: FontSize.body },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: FontSize.small, color: Colors.textTertiary },
  workoutCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 14 },
  workoutIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  workoutType: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  workoutMeta: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },

  // Bottom sheet (workout modal)
  bsTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  bsLabel: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },
  bsInput: { backgroundColor: '#F7F8FA', borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 16, fontSize: FontSize.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight },
  bsBtn: { borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md },
  bsBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },

  // Workout type chips
  wkTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.borderLight, marginRight: 8 },
  wkTypeText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },

  // Workout intensity chips
  wkIntChip: { flex: 1, paddingVertical: 10, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center' },
  wkIntChipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  wkIntText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  wkIntTextActive: { color: Colors.green },
});
