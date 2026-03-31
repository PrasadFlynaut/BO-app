import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadow } from '@/src/theme';

export default function TabLayout() {
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
      <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={24} color={color} /></View> }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} /></View> }} />
      <Tabs.Screen name="chat" options={{ title: 'Coach', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={24} color={color} /></View> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <View style={focused ? styles.activeIcon : undefined}><Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} /></View> }} />
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
