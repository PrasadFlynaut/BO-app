import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInLeft, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { Colors, Spacing, Radius } from '@/src/theme';
import { useRouter } from 'expo-router';

const SIDEBAR_ITEMS = [
  { icon: 'cafe-outline' as const, label: 'Breakfast', route: '/(tabs)/quick-adds', action: 'breakfast' },
  { icon: 'restaurant-outline' as const, label: 'Brunch', route: '/(tabs)/quick-adds', action: 'brunch' },
  { icon: 'chatbubble-ellipses-outline' as const, label: '11:11 Snack', route: '/(tabs)/quick-adds', action: 'snack' },
  { icon: 'nutrition-outline' as const, label: 'Lunch', route: '/(tabs)/quick-adds', action: 'lunch' },
  { icon: 'beer-outline' as const, label: 'Tea', route: '/(tabs)/quick-adds', action: 'tea' },
  { icon: 'fast-food-outline' as const, label: 'Dinner', route: '/(tabs)/quick-adds', action: 'dinner' },
  { icon: 'water-outline' as const, label: 'Water', route: '/(tabs)/quick-adds', action: 'water' },
  { icon: 'body-outline' as const, label: 'Daily Activity', route: '/(tabs)/quick-adds', action: 'activity' },
  { icon: 'bed-outline' as const, label: 'Sleep', route: '/(tabs)/quick-adds', action: 'sleep' },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
};

export default function SidebarPanel({ isOpen, onClose, onOpen }: Props) {
  const router = useRouter();

  return (
    <>
      {/* Floating toggle chevron */}
      {!isOpen && (
        <Pressable onPress={onOpen} style={s.sidebarToggle}>
          <View style={s.sidebarToggleInner}>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </View>
        </Pressable>
      )}

      {/* Sidebar overlay + panel */}
      {isOpen && (
        <>
          <Animated.View entering={FadeIn.duration(200)} style={s.sidebarOverlay}>
            <Pressable style={{ flex: 1 }} onPress={onClose} />
          </Animated.View>
          <Animated.View entering={SlideInLeft.duration(250)} exiting={SlideOutLeft.duration(200)} style={s.sidebarContainer}>
            <SafeAreaView style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={s.sidebarScroll} showsVerticalScrollIndicator={false}>
                {SIDEBAR_ITEMS.map((item, idx) => (
                  <Animated.View key={item.label} entering={FadeInLeft.delay(idx * 40).duration(250)}>
                    <TouchableOpacity
                      style={s.sidebarItem}
                      activeOpacity={0.7}
                      onPress={() => { onClose(); setTimeout(() => router.push(item.route as any), 150); }}
                    >
                      <View style={s.sidebarIconWrap}>
                        <Ionicons name={item.icon} size={28} color={Colors.green} />
                      </View>
                      <Text style={s.sidebarLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </ScrollView>
              <TouchableOpacity style={s.sidebarBack} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={22} color={Colors.textTertiary} />
              </TouchableOpacity>
            </SafeAreaView>
          </Animated.View>
        </>
      )}
    </>
  );
}

const s = StyleSheet.create({
  sidebarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 100,
  },
  sidebarContainer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: 110,
    backgroundColor: '#FFFFFF',
    zIndex: 101,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  sidebarScroll: { paddingTop: Spacing.md, paddingBottom: 60, alignItems: 'center' },
  sidebarItem: { alignItems: 'center', paddingVertical: 10, width: 100 },
  sidebarIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sidebarLabel: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  sidebarBack: {
    position: 'absolute', bottom: 24, right: -16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 6,
  },
  sidebarToggle: {
    position: 'absolute',
    left: 0,
    top: '56%',
    zIndex: 999,
    width: 36,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  sidebarToggleInner: {
    width: 26,
    height: 38,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: 'rgba(245,245,245,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
