/**
 * Unified health data service.
 * - iOS  → Apple HealthKit via react-native-health
 * - Android → Google Health Connect via react-native-health-connect
 * Falls back to simulated data in Expo Go / web (no native bridge).
 */
import { Platform, NativeModules } from 'react-native';

export interface HealthMetrics {
  steps: number;
  heartRate: number;
  calories: number;
  distanceKm: number;
  sleepHours: number;
  activeMinutes: number;
  source: 'healthkit' | 'healthconnect' | 'simulated';
}

export interface HealthPermissionStatus {
  granted: boolean;
  platform: 'ios' | 'android' | 'web';
}

// Detect whether native modules are actually linked (fails gracefully in Expo Go)
const healthKitLinked = Platform.OS === 'ios' && !!NativeModules.AppleHealthKit;
const healthConnectLinked = Platform.OS === 'android' && !!NativeModules.HealthConnect;

// Wrap a callback-based native call in a Promise with a timeout so it can never hang
function withTimeout<T>(ms: number, promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);
}

// ─── iOS / Apple HealthKit ────────────────────────────────────────────────────

let AppleHealthKit: any = null;
if (healthKitLinked) {
  try { AppleHealthKit = require('react-native-health').default; } catch {}
}

const HKPermissions = AppleHealthKit
  ? {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.AppleExerciseTime,
        ],
        write: [
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.Steps,
        ],
      },
    }
  : null;

async function requestHealthKitPermissions(): Promise<boolean> {
  if (!AppleHealthKit || !HKPermissions) return false;
  const result = await withTimeout(
    10000,
    new Promise<boolean>(resolve => {
      AppleHealthKit.initHealthKit(HKPermissions, (err: any) => resolve(!err));
    }),
    false,
  );
  return result;
}

async function getHealthKitMetrics(): Promise<HealthMetrics | null> {
  if (!AppleHealthKit) return null;
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const options = { startDate: startOfDay.toISOString(), endDate: today.toISOString() };

  const get = (fn: Function, opt: any) =>
    withTimeout(5000, new Promise<any>(resolve => fn(opt, (_: any, r: any) => resolve(r))), null);

  try {
    const [stepsRes, hrRes, calRes, distRes, sleepRes, activeRes] = await Promise.all([
      get(AppleHealthKit.getStepCount.bind(AppleHealthKit), options),
      get(AppleHealthKit.getHeartRateSamples.bind(AppleHealthKit), { ...options, limit: 20 }),
      get(AppleHealthKit.getActiveEnergyBurned.bind(AppleHealthKit), options),
      get(AppleHealthKit.getDistanceWalkingRunning.bind(AppleHealthKit), options),
      get(AppleHealthKit.getSleepSamples.bind(AppleHealthKit), { ...options, limit: 5 }),
      get(AppleHealthKit.getAppleExerciseTime.bind(AppleHealthKit), options),
    ]);

    const steps = stepsRes?.value ?? 0;
    const heartRate = hrRes?.length
      ? Math.round(hrRes.reduce((s: number, r: any) => s + r.value, 0) / hrRes.length)
      : 0;
    const calories = calRes?.length
      ? Math.round(calRes.reduce((s: number, r: any) => s + r.value, 0))
      : 0;
    const distanceKm = distRes?.value ? Math.round(distRes.value / 10) / 100 : 0;
    const sleepHours = sleepRes?.length
      ? Math.round(
          sleepRes
            .filter((r: any) => r.value === 'ASLEEP')
            .reduce((s: number, r: any) => {
              return s + (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 3600000;
            }, 0) * 10,
        ) / 10
      : 0;
    const activeMinutes = activeRes?.value ?? 0;

    return { steps, heartRate, calories, distanceKm, sleepHours, activeMinutes, source: 'healthkit' };
  } catch {
    return null;
  }
}

// ─── Android / Health Connect ─────────────────────────────────────────────────

let HC: any = null;
if (healthConnectLinked) {
  try { HC = require('react-native-health-connect'); } catch {}
}

async function requestHealthConnectPermissions(): Promise<boolean> {
  if (!HC) return false;
  try {
    await withTimeout(5000, HC.initialize(), undefined);
    const granted = await withTimeout(
      15000,
      HC.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'ExerciseSession' },
      ]),
      [] as any[],
    );
    return (granted as any[]).every((p: any) => p.granted);
  } catch {
    return false;
  }
}

async function getHealthConnectMetrics(): Promise<HealthMetrics | null> {
  if (!HC) return null;
  try {
    await withTimeout(5000, HC.initialize(), undefined);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: startOfDay.toISOString(),
      endTime: now.toISOString(),
    };

    const [stepsRes, hrRes, calRes, distRes, sleepRes, exerciseRes] = await Promise.all([
      withTimeout(5000, HC.readRecords('Steps', { timeRangeFilter }), { records: [] }),
      withTimeout(5000, HC.readRecords('HeartRate', { timeRangeFilter }), { records: [] }),
      withTimeout(5000, HC.readRecords('ActiveCaloriesBurned', { timeRangeFilter }), { records: [] }),
      withTimeout(5000, HC.readRecords('Distance', { timeRangeFilter }), { records: [] }),
      withTimeout(5000, HC.readRecords('SleepSession', { timeRangeFilter }), { records: [] }),
      withTimeout(5000, HC.readRecords('ExerciseSession', { timeRangeFilter }), { records: [] }),
    ]);

    const steps = (stepsRes as any).records?.reduce((s: number, r: any) => s + (r.count ?? 0), 0) ?? 0;
    const allHR = (hrRes as any).records?.flatMap((r: any) => r.samples?.map((s: any) => s.beatsPerMinute) ?? []) ?? [];
    const heartRate = allHR.length ? Math.round(allHR.reduce((s: number, v: number) => s + v, 0) / allHR.length) : 0;
    const calories = Math.round((calRes as any).records?.reduce((s: number, r: any) => s + (r.energy?.inKilocalories ?? 0), 0) ?? 0);
    const distanceKm = Math.round(((distRes as any).records?.reduce((s: number, r: any) => s + (r.distance?.inMeters ?? 0), 0) ?? 0) / 10) / 100;
    const sleepHours = Math.round(
      ((sleepRes as any).records?.reduce((s: number, r: any) => {
        return s + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 3600000;
      }, 0) ?? 0) * 10,
    ) / 10;
    const activeMinutes = Math.round(
      (exerciseRes as any).records?.reduce((s: number, r: any) => {
        return s + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000;
      }, 0) ?? 0,
    );

    return { steps, heartRate, calories, distanceKm, sleepHours, activeMinutes, source: 'healthconnect' };
  } catch {
    return null;
  }
}

// ─── Simulated fallback ───────────────────────────────────────────────────────

function simulateMetrics(): HealthMetrics {
  const steps = Math.floor(Math.random() * 5000) + 3000;
  return {
    steps,
    heartRate: Math.floor(Math.random() * 20) + 65,
    calories: Math.round(steps * 0.04),
    distanceKm: Math.round(steps * 0.762) / 1000,
    sleepHours: Math.round((Math.random() * 2 + 6) * 10) / 10,
    activeMinutes: Math.floor(steps / 100),
    source: 'simulated',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isHealthAvailable(): boolean {
  return healthKitLinked || healthConnectLinked;
}

export async function requestHealthPermissions(): Promise<HealthPermissionStatus> {
  if (Platform.OS === 'ios') {
    const granted = await requestHealthKitPermissions();
    return { granted, platform: 'ios' };
  }
  if (Platform.OS === 'android') {
    const granted = await requestHealthConnectPermissions();
    return { granted, platform: 'android' };
  }
  return { granted: false, platform: 'web' };
}

export async function readTodayMetrics(): Promise<HealthMetrics> {
  if (healthKitLinked) {
    const data = await getHealthKitMetrics();
    if (data) return data;
  }
  if (healthConnectLinked) {
    const data = await getHealthConnectMetrics();
    if (data) return data;
  }
  return simulateMetrics();
}
