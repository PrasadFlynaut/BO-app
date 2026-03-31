import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, RefreshControl, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const ZONES = [
  { key: 'meals', icon: 'restaurant', label: 'Quick Add' },
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
  { name: 'Strength Training', value: 6.0 },
];

export default function QuickAddsScreen() {
  const { user } = useAuth();
  const [activeZone, setActiveZone] = useState('meals');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Meal state
  const [mealLogs, setMealLogs] = useState<any[]>([]);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');

  // Water state
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterGoal] = useState(8);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);

  // Sleep state
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [sleepHours, setSleepHours] = useState('7');
  const [sleepMinutes, setSleepMinutes] = useState('30');
  const [sleepQuality, setSleepQuality] = useState(3);

  // Walking state
  const [walkLogs, setWalkLogs] = useState<any[]>([]);
  const [showWalkModal, setShowWalkModal] = useState(false);
  const [walkSteps, setWalkSteps] = useState('');
  const [walkDuration, setWalkDuration] = useState('');

  // MET state
  const [metLogs, setMetLogs] = useState<any[]>([]);
  const [showMetModal, setShowMetModal] = useState(false);
  const [metActivity, setMetActivity] = useState(MET_ACTIVITIES[0]);
  const [metDuration, setMetDuration] = useState('');

  // Journal state
  const [journals, setJournals] = useState<any[]>([]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalDesc, setJournalDesc] = useState('');

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Summary state
  const [summary, setSummary] = useState<any>(null);

  useFocusEffect(useCallback(() => { loadAllData(); }, []));

  const loadAllData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [mealsRes, waterRes, sleepRes, walkRes, metRes, journalRes, timelineRes, summaryRes] = await Promise.all([
        api.get(`/v1/meals/log?date=${today}`).catch(() => ({ data: { logs: [] } })),
        api.get(`/v1/trackers/water?date=${today}`).catch(() => ({ data: { logs: [], dailyTotals: [] } })),
        api.get('/v1/trackers/sleep').catch(() => ({ data: { logs: [] } })),
        api.get('/v1/trackers/walking').catch(() => ({ data: { logs: [], weeklyTotal: 0 } })),
        api.get('/v1/trackers/met').catch(() => ({ data: { logs: [], weeklyTotal: 0 } })),
        api.get('/v1/journal?limit=20').catch(() => ({ data: { data: [] } })),
        api.get(`/v1/trackers/timeline?date=${today}`).catch(() => ({ data: { events: [] } })),
        api.get(`/v1/trackers/summary?date=${today}`).catch(() => ({ data: {} })),
      ]);
      setMealLogs(mealsRes.data.logs || []);
      const wLogs = waterRes.data.logs || [];
      setWaterLogs(wLogs);
      setWaterTotal(wLogs.reduce((s: number, w: any) => s + (w.glasses || 0), 0));
      setSleepLogs(sleepRes.data.logs || []);
      setWalkLogs(walkRes.data.logs || []);
      setMetLogs(metRes.data.logs || []);
      setJournals(journalRes.data.data || []);
      setTimelineEvents(timelineRes.data.events || []);
      setSummary(summaryRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const onRefresh = async () => { setRefreshing(true); await loadAllData(); setRefreshing(false); };

  // ===== MEAL ACTIONS =====
  const openMealSlot = (slot: any) => {
    setSelectedSlot(slot);
    setMealName('');
    setMealCalories('');
    setShowMealModal(true);
  };

  const saveMeal = async () => {
    if (!mealName.trim()) return;
    try {
      await api.post('/v1/meals/log', {
        meal_type: selectedSlot.type,
        name: mealName.trim(),
        calories: parseInt(mealCalories) || 0,
      });
      setShowMealModal(false);
      loadAllData();
    } catch (e) { console.error(e); }
  };

  const deleteMeal = async (id: string) => {
    Alert.alert('Delete Meal', 'Remove this meal log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/v1/meals/log/${id}`); loadAllData(); } catch (e) { console.error(e); }
      }},
    ]);
  };

  const getMealForSlot = (type: string) => mealLogs.filter(m => m.meal_type === type);

  // ===== WATER ACTIONS =====
  const addWater = async () => {
    try {
      const { data } = await api.post('/v1/trackers/water', { glasses: 1 });
      setWaterTotal(data.dailyTotal || waterTotal + 1);
      loadAllData();
    } catch (e) { console.error(e); }
  };

  // ===== SLEEP ACTIONS =====
  const saveSleep = async () => {
    const totalMins = (parseInt(sleepHours) || 0) * 60 + (parseInt(sleepMinutes) || 0);
    const now = new Date();
    const bedtime = new Date(now.getTime() - totalMins * 60000).toISOString();
    try {
      await api.post('/v1/trackers/sleep', {
        bedtime,
        wake_time: now.toISOString(),
        duration: totalMins,
        quality: sleepQuality,
      });
      setShowSleepModal(false);
      loadAllData();
    } catch (e) { console.error(e); }
  };

  // ===== WALKING ACTIONS =====
  const saveWalk = async () => {
    const steps = parseInt(walkSteps) || 0;
    if (steps <= 0) return;
    try {
      await api.post('/v1/trackers/walking', {
        steps,
        duration: parseInt(walkDuration) || 0,
      });
      setShowWalkModal(false);
      setWalkSteps('');
      setWalkDuration('');
      loadAllData();
    } catch (e) { console.error(e); }
  };

  // ===== MET ACTIONS =====
  const saveMet = async () => {
    const dur = parseInt(metDuration) || 0;
    if (dur <= 0) return;
    try {
      await api.post('/v1/trackers/met', {
        activity_type: metActivity.name,
        met_value: metActivity.value,
        duration: dur,
        met_minutes: metActivity.value * dur,
      });
      setShowMetModal(false);
      setMetDuration('');
      loadAllData();
    } catch (e) { console.error(e); }
  };

  // ===== JOURNAL ACTIONS =====
  const saveJournal = async () => {
    if (!journalTitle.trim() || journalTitle.trim().length < 3) return;
    try {
      await api.post('/v1/journal', { title: journalTitle.trim(), description: journalDesc.trim() });
      setShowJournalModal(false);
      setJournalTitle('');
      setJournalDesc('');
      loadAllData();
    } catch (e) { console.error(e); }
  };

  const deleteJournal = async (id: string) => {
    Alert.alert('Delete Entry', 'Delete this journal entry? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/v1/journal/${id}`); loadAllData(); } catch (e) { console.error(e); }
      }},
    ]);
  };

  const toggleJournalLike = async (id: string) => {
    try {
      await api.post('/v1/journal/like', { journal_id: id });
      loadAllData();
    } catch (e) { console.error(e); }
  };

  const totalCalories = mealLogs.reduce((s, m) => s + (m.calories || 0), 0);

  // ===== RENDER ZONES =====
  const renderMeals = () => (
    <View>
      {/* Calorie summary bar */}
      <View style={s.calorieBar}>
        <View style={s.calorieInfo}>
          <Ionicons name="flame" size={18} color={Colors.nutritionOrange} />
          <Text style={s.calorieText}>{totalCalories} cal consumed</Text>
        </View>
        <Text style={s.calorieGoal}>Goal: 2,000</Text>
      </View>

      {MEAL_SLOTS.map((slot, idx) => {
        const meals = getMealForSlot(slot.type);
        return (
          <Animated.View key={slot.type} entering={FadeInDown.delay(idx * 80).duration(400)}>
            <View style={[s.mealCard, Shadow.sm]}>
              <View style={s.mealCardHeader}>
                <View style={[s.mealIcon, { backgroundColor: slot.color + '15' }]}>
                  <Ionicons name={slot.icon as any} size={22} color={slot.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.mealLabel}>{slot.label}</Text>
                  <Text style={s.mealTime}>{slot.time}</Text>
                </View>
                <TouchableOpacity onPress={() => openMealSlot(slot)} style={s.addMealBtn}>
                  <Ionicons name="add-circle" size={28} color={Colors.green} />
                </TouchableOpacity>
              </View>
              {meals.length === 0 ? (
                <TouchableOpacity onPress={() => openMealSlot(slot)} style={s.tapToAdd}>
                  <Text style={s.tapToAddText}>Tap to add</Text>
                </TouchableOpacity>
              ) : (
                meals.map((m: any) => (
                  <View key={m.id} style={s.loggedMeal}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.loggedMealName}>{m.manual_name || m.name || 'Meal'}</Text>
                      {m.calories > 0 && (
                        <View style={s.calBadge}>
                          <Ionicons name="flame-outline" size={12} color={Colors.nutritionOrange} />
                          <Text style={s.calBadgeText}>{m.calories} cal</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => deleteMeal(m.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
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
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <View style={[s.trackerCard, Shadow.sm]}>
          <View style={s.trackerHeader}>
            <Ionicons name="water" size={22} color={Colors.waterBlue} />
            <Text style={s.trackerTitle}>Water Intake</Text>
          </View>
          <View style={s.waterTracker}>
            <View style={s.waterRing}>
              <View style={[s.waterRingFill, { height: `${Math.min(100, (waterTotal / waterGoal) * 100)}%` as any }]} />
              <View style={s.waterRingContent}>
                <Text style={s.waterCount}>{waterTotal}</Text>
                <Text style={s.waterLabel}>of {waterGoal}</Text>
              </View>
            </View>
            <View style={s.waterActions}>
              <Text style={s.waterStatus}>
                {waterTotal >= waterGoal ? 'Goal reached!' : `${waterGoal - waterTotal} more glasses to go`}
              </Text>
              <TouchableOpacity onPress={addWater} style={[s.waterAddBtn, Shadow.sm]}>
                <Ionicons name="add" size={24} color="#FFF" />
                <Text style={s.waterAddText}>Add Glass</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Sleep Tracker */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <View style={[s.trackerCard, Shadow.sm]}>
          <View style={s.trackerHeader}>
            <Ionicons name="moon" size={22} color={Colors.fitnessPurple} />
            <Text style={s.trackerTitle}>Sleep Tracking</Text>
          </View>
          {sleepLogs.length > 0 ? (
            <View style={s.sleepInfo}>
              <View style={s.sleepStat}>
                <Text style={s.sleepValue}>{Math.floor((sleepLogs[0]?.duration_minutes || 0) / 60)}h {(sleepLogs[0]?.duration_minutes || 0) % 60}m</Text>
                <Text style={s.sleepLabel}>Last night</Text>
              </View>
              <View style={s.sleepQualityRow}>
                {[1,2,3,4,5].map(i => (
                  <Ionicons key={i} name={i <= (sleepLogs[0]?.quality || 0) ? "moon" : "moon-outline"} size={18} color={Colors.fitnessPurple} />
                ))}
              </View>
            </View>
          ) : (
            <Text style={s.emptyTracker}>No sleep data logged</Text>
          )}
          <TouchableOpacity onPress={() => setShowSleepModal(true)} style={s.trackerLogBtn}>
            <Text style={s.trackerLogText}>Log Sleep</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Walking Tracker */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View style={[s.trackerCard, Shadow.sm]}>
          <View style={s.trackerHeader}>
            <Ionicons name="walk" size={22} color={Colors.socialTeal} />
            <Text style={s.trackerTitle}>Walking</Text>
          </View>
          {walkLogs.length > 0 ? (
            <View style={s.walkInfo}>
              <Text style={s.walkSteps}>{walkLogs.reduce((t: number, w: any) => t + (w.steps || 0), 0).toLocaleString()}</Text>
              <Text style={s.walkLabel}>steps this week</Text>
              <View style={s.walkProgressOuter}>
                <View style={[s.walkProgressInner, { width: `${Math.min(100, walkLogs.reduce((t: number, w: any) => t + (w.steps || 0), 0) / 70000 * 100)}%` as any }]} />
              </View>
              <Text style={s.walkGoalText}>Goal: 10,000 / day (70,000 / week)</Text>
            </View>
          ) : (
            <Text style={s.emptyTracker}>No walking data yet</Text>
          )}
          <TouchableOpacity onPress={() => setShowWalkModal(true)} style={s.trackerLogBtn}>
            <Text style={s.trackerLogText}>Log Walk</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* MET Tracker */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <View style={[s.trackerCard, Shadow.sm]}>
          <View style={s.trackerHeader}>
            <Ionicons name="barbell" size={22} color={Colors.danger} />
            <Text style={s.trackerTitle}>MET Tracker</Text>
          </View>
          <View style={s.metInfo}>
            <Text style={s.metTotal}>{Math.round(metLogs.reduce((t: number, m: any) => t + (m.met_minutes || 0), 0))}</Text>
            <Text style={s.metLabel}>MET-minutes this week</Text>
          </View>
          <View style={s.metCallout}>
            <Ionicons name="information-circle" size={16} color={Colors.waterBlue} />
            <Text style={s.metCalloutText}>MET measures exercise intensity. 1 MET = energy at rest.</Text>
          </View>
          <TouchableOpacity onPress={() => setShowMetModal(true)} style={s.trackerLogBtn}>
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
        <TouchableOpacity onPress={() => setShowJournalModal(true)} style={s.journalAddBtn}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
      {journals.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="book-outline" size={48} color={Colors.textTertiary} />
          <Text style={s.emptyTitle}>Start your journal</Text>
          <Text style={s.emptySubtext}>Tap + to write your first entry.</Text>
        </View>
      ) : (
        journals.map((j: any, idx: number) => (
          <Animated.View key={j.id} entering={FadeInDown.delay(idx * 60).duration(400)}>
            <View style={[s.journalCard, Shadow.sm]}>
              <Text style={s.journalTitle} numberOfLines={1}>{j.title}</Text>
              <Text style={s.journalPreview} numberOfLines={2}>{j.description}</Text>
              <View style={s.journalMeta}>
                <Text style={s.journalDate}>
                  {j.date === new Date().toISOString().split('T')[0] ? 'Today' : j.date}
                </Text>
                <View style={s.journalActions}>
                  <TouchableOpacity onPress={() => toggleJournalLike(j.id)} style={s.journalAction}>
                    <Ionicons name={j.is_liked ? "heart" : "heart-outline"} size={18} color={j.is_liked ? '#FF5252' : Colors.textTertiary} />
                    <Text style={[s.journalActionText, j.is_liked && { color: '#FF5252' }]}>{j.like_count || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteJournal(j.id)} style={s.journalAction}>
                    <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        ))
      )}
    </View>
  );

  const renderTimeline = () => (
    <View>
      <Text style={s.timelineTitle}>Today's Timeline</Text>
      {timelineEvents.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="time-outline" size={48} color={Colors.textTertiary} />
          <Text style={s.emptyTitle}>No activities yet</Text>
          <Text style={s.emptySubtext}>Log meals, water, or exercise to see your timeline</Text>
        </View>
      ) : (
        timelineEvents.map((ev: any, idx: number) => (
          <Animated.View key={idx} entering={FadeInDown.delay(idx * 60).duration(400)}>
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
                <Ionicons name={(ev.icon || 'ellipse') as any} size={18} color={ev.color || Colors.green} />
                <View style={{ flex: 1 }}>
                  <Text style={s.timelineCardTitle}>{ev.title}</Text>
                  <Text style={s.timelineCardDesc}>{ev.description}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Zone icon bar */}
      <View style={s.zoneBar}>
        {ZONES.map(z => (
          <TouchableOpacity
            key={z.key}
            style={[s.zoneBtn, activeZone === z.key && s.zoneBtnActive]}
            onPress={() => setActiveZone(z.key)}
          >
            <Ionicons
              name={(activeZone === z.key ? z.icon : `${z.icon}-outline`) as any}
              size={22}
              color={activeZone === z.key ? Colors.green : Colors.textTertiary}
            />
            <Text style={[s.zoneBtnText, activeZone === z.key && s.zoneBtnTextActive]}>{z.label}</Text>
            {activeZone === z.key && <View style={s.zoneIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        {loading ? (
          <View style={s.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
        ) : (
          <>
            {activeZone === 'meals' && renderMeals()}
            {activeZone === 'trackers' && renderTrackers()}
            {activeZone === 'journal' && renderJournal()}
            {activeZone === 'calendar' && renderTimeline()}
          </>
        )}
      </ScrollView>

      {/* Meal Log Modal */}
      <Modal visible={showMealModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Add {selectedSlot?.label || 'Meal'}</Text>
            <TextInput
              style={s.modalInput}
              placeholder="What did you eat?"
              placeholderTextColor={Colors.textTertiary}
              value={mealName}
              onChangeText={setMealName}
            />
            <TextInput
              style={s.modalInput}
              placeholder="Estimated calories (optional)"
              placeholderTextColor={Colors.textTertiary}
              value={mealCalories}
              onChangeText={setMealCalories}
              keyboardType="numeric"
            />
            <TouchableOpacity onPress={saveMeal} style={[s.modalSaveBtn, !mealName.trim() && s.modalSaveBtnDisabled]}>
              <Text style={s.modalSaveBtnText}>Save Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMealModal(false)} style={s.modalCancelBtn}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sleep Modal */}
      <Modal visible={showSleepModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Log Sleep</Text>
            <View style={s.sleepInputRow}>
              <View style={s.sleepInputWrap}>
                <Text style={s.sleepInputLabel}>Hours</Text>
                <TextInput style={s.modalInput} value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" placeholder="7" placeholderTextColor={Colors.textTertiary} />
              </View>
              <View style={s.sleepInputWrap}>
                <Text style={s.sleepInputLabel}>Minutes</Text>
                <TextInput style={s.modalInput} value={sleepMinutes} onChangeText={setSleepMinutes} keyboardType="numeric" placeholder="30" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>
            <Text style={s.sleepInputLabel}>Sleep Quality</Text>
            <View style={s.qualityRow}>
              {[1,2,3,4,5].map(q => (
                <TouchableOpacity key={q} onPress={() => setSleepQuality(q)} style={s.qualityBtn}>
                  <Ionicons name={q <= sleepQuality ? "moon" : "moon-outline"} size={28} color={Colors.fitnessPurple} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={saveSleep} style={s.modalSaveBtn}>
              <Text style={s.modalSaveBtnText}>Save Sleep</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSleepModal(false)} style={s.modalCancelBtn}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Walking Modal */}
      <Modal visible={showWalkModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Log Walk</Text>
            <TextInput style={s.modalInput} placeholder="Steps" placeholderTextColor={Colors.textTertiary} value={walkSteps} onChangeText={setWalkSteps} keyboardType="numeric" />
            <TextInput style={s.modalInput} placeholder="Duration (minutes, optional)" placeholderTextColor={Colors.textTertiary} value={walkDuration} onChangeText={setWalkDuration} keyboardType="numeric" />
            {walkSteps ? (
              <View style={s.calcRow}>
                <Text style={s.calcText}>Distance: {(parseInt(walkSteps) * 0.0008).toFixed(2)} km</Text>
                <Text style={s.calcText}>Calories: {Math.round(parseInt(walkSteps) * 0.04)} kcal</Text>
              </View>
            ) : null}
            <TouchableOpacity onPress={saveWalk} style={[s.modalSaveBtn, !walkSteps && s.modalSaveBtnDisabled]}>
              <Text style={s.modalSaveBtnText}>Log Walk</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowWalkModal(false)} style={s.modalCancelBtn}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MET Modal */}
      <Modal visible={showMetModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Log Activity (MET)</Text>
            <Text style={s.sleepInputLabel}>Activity Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.metActivityScroll}>
              {MET_ACTIVITIES.map(a => (
                <TouchableOpacity
                  key={a.name}
                  style={[s.metActivityChip, metActivity.name === a.name && s.metActivityChipActive]}
                  onPress={() => setMetActivity(a)}
                >
                  <Text style={[s.metActivityText, metActivity.name === a.name && s.metActivityTextActive]}>{a.name}</Text>
                  <Text style={[s.metActivityValue, metActivity.name === a.name && s.metActivityTextActive]}>{a.value}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={s.modalInput} placeholder="Duration (minutes)" placeholderTextColor={Colors.textTertiary} value={metDuration} onChangeText={setMetDuration} keyboardType="numeric" />
            {metDuration ? (
              <View style={s.calcRow}>
                <Text style={s.calcText}>MET-minutes: {(metActivity.value * parseInt(metDuration || '0')).toFixed(0)}</Text>
              </View>
            ) : null}
            <TouchableOpacity onPress={saveMet} style={[s.modalSaveBtn, !metDuration && s.modalSaveBtnDisabled]}>
              <Text style={s.modalSaveBtnText}>Log Activity</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMetModal(false)} style={s.modalCancelBtn}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Journal Modal */}
      <Modal visible={showJournalModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>New Journal Entry</Text>
            <TextInput
              style={s.modalInput}
              placeholder="What is on your mind?"
              placeholderTextColor={Colors.textTertiary}
              value={journalTitle}
              onChangeText={setJournalTitle}
              maxLength={100}
            />
            <TextInput
              style={[s.modalInput, { height: 120, textAlignVertical: 'top' }]}
              placeholder="Write your thoughts..."
              placeholderTextColor={Colors.textTertiary}
              value={journalDesc}
              onChangeText={setJournalDesc}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity onPress={saveJournal} style={[s.modalSaveBtn, (!journalTitle.trim() || journalTitle.trim().length < 3) && s.modalSaveBtnDisabled]}>
              <Text style={s.modalSaveBtnText}>Save Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowJournalModal(false)} style={s.modalCancelBtn}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flex: 1 },
  content: { paddingBottom: 100, paddingTop: 8 },
  loadWrap: { paddingVertical: 80, alignItems: 'center' },

  // Zone bar
  zoneBar: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingTop: 8, paddingBottom: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  zoneBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  zoneBtnActive: {},
  zoneBtnText: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary, marginTop: 4 },
  zoneBtnTextActive: { color: Colors.green },
  zoneIndicator: { position: 'absolute', bottom: 0, width: 24, height: 3, backgroundColor: Colors.green, borderRadius: 2 },

  // Calorie bar
  calorieBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: Spacing.md, padding: 14, backgroundColor: Colors.nutritionSurface, borderRadius: Radius.lg, marginBottom: Spacing.md },
  calorieInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calorieText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  calorieGoal: { fontSize: FontSize.small, color: Colors.textSecondary },

  // Meal cards
  mealCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 14 },
  mealCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealLabel: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  mealTime: { fontSize: FontSize.caption, color: Colors.textTertiary },
  addMealBtn: { padding: 4 },
  tapToAdd: { paddingVertical: 10, paddingLeft: 56 },
  tapToAddText: { fontSize: FontSize.small, color: Colors.textTertiary, fontStyle: 'italic' },
  loggedMeal: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingLeft: 56, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 8 },
  loggedMealName: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textPrimary },
  calBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  calBadgeText: { fontSize: FontSize.caption, color: Colors.nutritionOrange, fontWeight: '600' },

  // Tracker cards
  trackerCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 16 },
  trackerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  trackerTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  emptyTracker: { fontSize: FontSize.small, color: Colors.textTertiary, fontStyle: 'italic', marginBottom: 8 },
  trackerLogBtn: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  trackerLogText: { color: Colors.green, fontWeight: '700', fontSize: FontSize.small },

  // Water tracker
  waterTracker: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  waterRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.waterSurface, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center', borderWidth: 3, borderColor: Colors.waterBlue + '30' },
  waterRingFill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.waterBlue + '30' },
  waterRingContent: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  waterCount: { fontSize: 28, fontWeight: '800', color: Colors.waterBlue },
  waterLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  waterActions: { flex: 1, gap: 12 },
  waterStatus: { fontSize: FontSize.small, color: Colors.textSecondary },
  waterAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.waterBlue, borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start' },
  waterAddText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.small },

  // Sleep
  sleepInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sleepStat: {},
  sleepValue: { fontSize: 24, fontWeight: '800', color: Colors.fitnessPurple },
  sleepLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  sleepQualityRow: { flexDirection: 'row', gap: 4 },

  // Walking
  walkInfo: { alignItems: 'center', gap: 4 },
  walkSteps: { fontSize: 28, fontWeight: '800', color: Colors.socialTeal },
  walkLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  walkProgressOuter: { width: '100%', height: 8, backgroundColor: Colors.socialTeal + '15', borderRadius: 4, marginTop: 8 },
  walkProgressInner: { height: '100%', backgroundColor: Colors.socialTeal, borderRadius: 4 },
  walkGoalText: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 4 },

  // MET
  metInfo: { alignItems: 'center', marginBottom: 8 },
  metTotal: { fontSize: 28, fontWeight: '800', color: Colors.danger },
  metLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  metCallout: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: Colors.waterSurface, borderRadius: Radius.sm },
  metCalloutText: { flex: 1, fontSize: FontSize.caption, color: Colors.waterBlue },

  // Journal
  journalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  journalHeaderTitle: { fontSize: FontSize.h3, fontWeight: '700', color: Colors.textPrimary },
  journalAddBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
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
  timelineCardTitle: { fontSize: FontSize.small, fontWeight: '700', color: Colors.textPrimary },
  timelineCardDesc: { fontSize: FontSize.caption, color: Colors.textSecondary },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: FontSize.small, color: Colors.textTertiary },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  modalInput: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 16, fontSize: FontSize.body, color: Colors.textPrimary, marginBottom: Spacing.sm },
  modalSaveBtn: { backgroundColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm },
  modalSaveBtnDisabled: { opacity: 0.5 },
  modalSaveBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  modalCancelText: { color: Colors.textTertiary, fontSize: FontSize.body },

  // Sleep modal extras
  sleepInputRow: { flexDirection: 'row', gap: 12 },
  sleepInputWrap: { flex: 1 },
  sleepInputLabel: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  qualityRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md, marginTop: 8, justifyContent: 'center' },
  qualityBtn: { padding: 8 },

  // Walk & MET calc
  calcRow: { flexDirection: 'row', gap: 16, marginVertical: 8, paddingHorizontal: 4 },
  calcText: { fontSize: FontSize.small, color: Colors.textSecondary },

  // MET activity selector
  metActivityScroll: { marginBottom: Spacing.sm },
  metActivityChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.borderLight, marginRight: 8, alignItems: 'center' },
  metActivityChipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  metActivityText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  metActivityTextActive: { color: Colors.green },
  metActivityValue: { fontSize: FontSize.caption, color: Colors.textTertiary },
});
