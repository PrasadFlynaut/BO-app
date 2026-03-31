import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import { useEffect } from 'react';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} /></View> }} />
      <Tabs.Screen name="menu" options={{ title: 'Culinary', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={24} color={color} /></View> }} />
      <Tabs.Screen name="quick-adds" options={{ title: 'Quick Add', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} /></View> }} />
      <Tabs.Screen name="goals" options={{ title: 'My Goals', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={24} color={color} /></View> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} /></View> }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
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
    backgroundColor: Colors.greenLight,
    borderRadius: 14,
    padding: 6,
    marginBottom: -4,
  },
});
