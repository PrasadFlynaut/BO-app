import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import api from './api';

export function usePedometer() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    checkAvailability();
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const checkAvailability = async () => {
    try {
      const available = await Pedometer.isAvailableAsync();
      setIsAvailable(available);
      if (available) {
        const { status } = await Pedometer.requestPermissionsAsync();
        setPermissionGranted(status === 'granted');
        if (status === 'granted') {
          getTodaySteps();
          startLiveTracking();
        }
      }
    } catch (e) {
      console.log('Pedometer not available:', e);
      setIsAvailable(false);
    }
  };

  const getTodaySteps = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, end);
      setTodaySteps(result.steps);
    } catch (e) {
      console.log('Error getting today steps:', e);
    }
  };

  const startLiveTracking = () => {
    if (subscriptionRef.current) return;
    subscriptionRef.current = Pedometer.watchStepCount(result => {
      setCurrentSteps(prev => prev + result.steps);
    });
  };

  const syncStepsToBackend = async () => {
    if (todaySteps <= 0) return false;
    try {
      await api.post('/v1/wearables/data', {
        provider: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
        data_type: 'steps',
        value: todaySteps + currentSteps,
        unit: 'steps',
      });
      return true;
    } catch (e) {
      console.error('Sync steps error:', e);
      return false;
    }
  };

  return {
    isAvailable,
    permissionGranted,
    todaySteps: todaySteps + currentSteps,
    liveSteps: currentSteps,
    syncStepsToBackend,
    refreshSteps: getTodaySteps,
  };
}
