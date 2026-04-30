import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import { useEffect } from 'react';
import { usePushNotifications, scheduleDailyReminder } from '@/src/notifications';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Register for push notifications on app load
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    // Schedule daily happiness check-in reminder at 8 PM
    scheduleDailyReminder(
      'happiness-checkin',
      'How are you feeling today? \u{1F60A}',
      'Take a moment to log your happiness level. Your daily check-in helps track your wellness journey.',
      20, 0 // 8 PM
    ).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  if (!user) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
        tabBarItemStyle: { paddingVertical: 4 },
        sceneStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : styles.inactiveIcon}><Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} /></View> }} />
      <Tabs.Screen name="menu" options={{ title: 'Culinary', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : styles.inactiveIcon}><Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={22} color={color} /></View> }} />
      <Tabs.Screen name="quick-adds" options={{ title: 'Quick Add', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : styles.inactiveIcon}><Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={22} color={color} /></View> }} />
      <Tabs.Screen name="goals" options={{ title: 'My Goals', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : styles.inactiveIcon}><Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={22} color={color} /></View> }} />
      <Tabs.Screen name="feed" options={{ title: 'Connect', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : styles.inactiveIcon}><Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} /></View> }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    height: 72,
    paddingBottom: 10,
    paddingTop: 6,
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    borderRadius: 28,
    marginBottom: 8,
    ...Shadow.lg,
  },
  activeIcon: {
    width: 44,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIcon: {
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
