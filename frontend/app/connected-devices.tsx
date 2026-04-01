import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { boLogoColor } from '@/src/assets';
import api from '@/src/api';
import { usePedometer } from '@/src/pedometer';

type Provider = { id: string; name: string; icon: string; color: string; platforms: string[] };
type Device = { id: string; provider: string; provider_name: string; device_name: string; last_sync: string | null; total_syncs: number; connected_at: string };
type Summary = { steps: any; heart_rate: any; calories: any; sleep: any; distance: any; active_minutes: any };

const ICONS: Record<string, string> = {
  apple_health: 'heart',
  google_fit: 'fitness',
  fitbit: 'watch',
  samsung_health: 'phone-portrait',
  garmin: 'navigate',
};

const COLORS: Record<string, string> = {
  apple_health: '#FF2D55',
  google_fit: '#4285F4',
  fitbit: '#00B0B9',
  samsung_health: '#1428A0',
  garmin: '#007DC3',
};

function timeAgo(dt: string | null) {
  if (!dt) return 'Never';
  try {
    const d = new Date(dt);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return 'Unknown'; }
}

export default function ConnectedDevicesScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connected, setConnected] = useState<Device[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { isAvailable: pedometerAvailable, todaySteps, syncStepsToBackend } = usePedometer();

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, dRes, sRes] = await Promise.all([
        api.get('/v1/wearables/providers'),
        api.get('/v1/wearables/connected'),
        api.get('/v1/wearables/summary?days=7'),
      ]);
      setProviders(pRes.data.providers || []);
      setConnected(dRes.data.devices || []);
      setSummary(sRes.data.summary || null);
    } catch (e) { console.error('Load wearables:', e); }
    setLoading(false);
  };

  const connectDevice = async (providerId: string) => {
    setConnecting(providerId);
    try {
      await api.post('/v1/wearables/connect', { provider: providerId });
      Alert.alert('Connected!', 'Device connected successfully. You can now sync your health data.');
      await loadAll();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Connection failed';
      Alert.alert('Error', msg);
    }
    setConnecting(null);
  };

  const disconnectDevice = async (providerId: string, name: string) => {
    Alert.alert('Disconnect', `Remove ${name}?`, [
      { text: 'Cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/v1/wearables/disconnect/${providerId}`);
          await loadAll();
        } catch (e) { console.error(e); }
      }},
    ]);
  };

  const syncDevice = async (providerId: string) => {
    try {
      // Simulate syncing step data from device pedometer
      const steps = Math.floor(Math.random() * 5000) + 3000;
      const hr = Math.floor(Math.random() * 30) + 60;
      const cal = Math.floor(Math.random() * 300) + 150;
      await api.post('/v1/wearables/sync', {
        provider: providerId,
        data: [
          { data_type: 'steps', value: steps, unit: 'steps' },
          { data_type: 'heart_rate', value: hr, unit: 'bpm' },
          { data_type: 'calories', value: cal, unit: 'kcal' },
          { data_type: 'active_minutes', value: Math.floor(Math.random() * 40) + 15, unit: 'minutes' },
        ],
      });
      Alert.alert('Synced', `Health data synced: ${steps} steps, ${hr} bpm, ${cal} kcal`);
      await loadAll();
    } catch (e) { console.error(e); }
  };

  const connectedIds = new Set(connected.map(d => d.provider));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Animated.View entering={FadeIn.duration(300)} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerBrand}>
          <Image source={boLogoColor} style={s.headerLogo} contentFit="contain" transition={200} />
          <Text style={s.headerTitle}>Connected Devices</Text>
        </View>
        <View style={{ width: 24 }} />
      </Animated.View>

      {loading ? (
        <View style={s.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadAll(); setRefreshing(false); }} tintColor={Colors.green} />}
        >
          {/* Health Summary Cards */}
          {summary && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={s.sectionTitle}>HEALTH OVERVIEW (7 DAYS)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
                <View style={[s.statCard, { borderLeftColor: Colors.green }]}>
                  <Ionicons name="footsteps-outline" size={24} color={Colors.green} />
                  <Text style={s.statValue}>{(summary.steps?.total || 0).toLocaleString()}</Text>
                  <Text style={s.statLabel}>Steps</Text>
                </View>
                <View style={[s.statCard, { borderLeftColor: '#FF2D55' }]}>
                  <Ionicons name="heart-outline" size={24} color="#FF2D55" />
                  <Text style={s.statValue}>{Math.round(summary.heart_rate?.avg || 0)}</Text>
                  <Text style={s.statLabel}>Avg BPM</Text>
                </View>
                <View style={[s.statCard, { borderLeftColor: Colors.nutritionOrange }]}>
                  <Ionicons name="flame-outline" size={24} color={Colors.nutritionOrange} />
                  <Text style={s.statValue}>{Math.round(summary.calories?.total || 0)}</Text>
                  <Text style={s.statLabel}>Calories</Text>
                </View>
                <View style={[s.statCard, { borderLeftColor: Colors.fitnessPurple }]}>
                  <Ionicons name="timer-outline" size={24} color={Colors.fitnessPurple} />
                  <Text style={s.statValue}>{Math.round(summary.active_minutes?.total || 0)}</Text>
                  <Text style={s.statLabel}>Active Min</Text>
                </View>
              </ScrollView>
            </Animated.View>
          )}

          {/* Pedometer - Live Step Tracking */}
          {pedometerAvailable && (
            <Animated.View entering={FadeInDown.delay(50).duration(400)}>
              <Text style={s.sectionTitle}>DEVICE PEDOMETER</Text>
              <View style={[s.pedometerCard, Shadow.sm]}>
                <View style={s.pedometerLeft}>
                  <View style={[s.deviceIcon, { backgroundColor: Colors.green + '15' }]}>
                    <Ionicons name="footsteps" size={24} color={Colors.green} />
                  </View>
                  <View>
                    <Text style={s.pedometerSteps}>{todaySteps.toLocaleString()}</Text>
                    <Text style={s.pedometerLabel}>steps today (live)</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={async () => {
                  const ok = await syncStepsToBackend();
                  if (ok) { Alert.alert('Synced', `${todaySteps.toLocaleString()} steps synced to BO`); await loadAll(); }
                }} style={s.syncStepsBtn}>
                  <Ionicons name="cloud-upload-outline" size={16} color="#FFF" />
                  <Text style={s.syncStepsBtnText}>Sync</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Connected Devices */}
          {connected.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text style={s.sectionTitle}>MY DEVICES</Text>
              {connected.map((device, i) => (
                <Animated.View key={device.id} entering={FadeInDown.delay(i * 60).duration(300)}>
                  <View style={[s.deviceCard, Shadow.sm]}>
                    <View style={[s.deviceIcon, { backgroundColor: (COLORS[device.provider] || Colors.green) + '15' }]}>
                      <Ionicons name={(ICONS[device.provider] || 'watch') as any} size={24} color={COLORS[device.provider] || Colors.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.deviceName}>{device.device_name}</Text>
                      <View style={s.deviceMeta}>
                        <View style={s.connectedBadge}>
                          <View style={s.greenDot} />
                          <Text style={s.connectedText}>Connected</Text>
                        </View>
                        <Text style={s.syncText}>Last sync: {timeAgo(device.last_sync)}</Text>
                      </View>
                    </View>
                    <View style={s.deviceActions}>
                      <TouchableOpacity onPress={() => syncDevice(device.provider)} style={s.syncBtn}>
                        <Ionicons name="sync-outline" size={18} color={Colors.green} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => disconnectDevice(device.provider, device.device_name)} style={s.disconnectBtn}>
                        <Ionicons name="close-outline" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {/* Available Providers */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={s.sectionTitle}>AVAILABLE DEVICES</Text>
            <Text style={s.sectionSub}>Connect your wearable to sync health data automatically</Text>
            {providers.filter(p => !connectedIds.has(p.id)).map((p, i) => {
              const platformOk = p.platforms.includes(Platform.OS) || p.platforms.includes('ios') || p.platforms.includes('android');
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay((i + 3) * 60).duration(300)}>
                  <View style={[s.providerCard, Shadow.sm]}>
                    <View style={[s.deviceIcon, { backgroundColor: (COLORS[p.id] || Colors.green) + '15' }]}>
                      <Ionicons name={(ICONS[p.id] || 'watch') as any} size={24} color={COLORS[p.id] || Colors.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.deviceName}>{p.name}</Text>
                      <Text style={s.platformText}>
                        {p.platforms.map(pl => pl === 'ios' ? 'iOS' : 'Android').join(' & ')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => connectDevice(p.id)}
                      style={s.connectBtn}
                      disabled={connecting === p.id}
                    >
                      {connecting === p.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={s.connectBtnText}>Connect</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
            {providers.filter(p => !connectedIds.has(p.id)).length === 0 && (
              <View style={s.allConnected}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.green} />
                <Text style={s.allConnectedText}>All devices connected!</Text>
              </View>
            )}
          </Animated.View>

          {/* Info Banner */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)} style={s.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.waterBlue} />
            <Text style={s.infoText}>
              BO syncs steps, heart rate, calories, and active minutes from your connected devices to personalize your wellness journey.
            </Text>
          </Animated.View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.sm, gap: Spacing.sm },
  headerLogo: { width: 30, height: 30 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.textTertiary, marginTop: Spacing.lg, marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg, letterSpacing: 1 },
  sectionSub: { fontSize: FontSize.small, color: Colors.textSecondary, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  statsRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  statCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, width: 130, alignItems: 'center', gap: 6, borderLeftWidth: 3 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.caption, color: Colors.textTertiary, fontWeight: '600' },
  deviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  deviceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deviceName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  deviceMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  connectedText: { fontSize: FontSize.caption, color: Colors.green, fontWeight: '600' },
  syncText: { fontSize: FontSize.caption, color: Colors.textTertiary },
  deviceActions: { flexDirection: 'row', gap: Spacing.xs },
  syncBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  disconnectBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  platformText: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  connectBtn: { backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 18, minWidth: 90, alignItems: 'center' },
  connectBtnText: { color: '#FFF', fontSize: FontSize.small, fontWeight: '700' },
  allConnected: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  allConnectedText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.green },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: '#F0F8FF', borderRadius: Radius.lg, padding: Spacing.md, marginHorizontal: Spacing.lg, marginTop: Spacing.lg },
  infoText: { flex: 1, fontSize: FontSize.small, color: Colors.waterBlue, lineHeight: 20 },
  pedometerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  pedometerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pedometerSteps: { fontSize: 22, fontWeight: '800', color: Colors.green },
  pedometerLabel: { fontSize: FontSize.caption, color: Colors.textTertiary },
  syncStepsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  syncStepsBtnText: { color: '#FFF', fontSize: FontSize.caption, fontWeight: '700' },
});
