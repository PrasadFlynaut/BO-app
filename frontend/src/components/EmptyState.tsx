import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, FontSize, Radius, Spacing } from '@/src/theme';

type Variant = 'green' | 'orange' | 'blue' | 'purple' | 'gray';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  variant?: Variant;
  compact?: boolean;
}

const PALETTE: Record<Variant, { bg: string[]; ring: string; icon: string; btn: string[] }> = {
  green:  { bg: ['#F0FDF4', '#DCFCE7'], ring: Colors.green + '30',  icon: Colors.green,          btn: [Colors.green, Colors.greenDark] },
  orange: { bg: ['#FFF7ED', '#FFEDD5'], ring: Colors.nutritionOrange + '30', icon: Colors.nutritionOrange, btn: [Colors.nutritionOrange, '#E07B00'] },
  blue:   { bg: ['#EFF6FF', '#DBEAFE'], ring: Colors.waterBlue + '30', icon: Colors.waterBlue,   btn: [Colors.waterBlue, '#2563EB'] },
  purple: { bg: ['#FDF4FF', '#F3E8FF'], ring: Colors.fitnessPurple + '30', icon: Colors.fitnessPurple, btn: [Colors.fitnessPurple, '#6D28D9'] },
  gray:   { bg: ['#F8FAFC', '#F1F5F9'], ring: '#CBD5E1',             icon: '#94A3B8',             btn: ['#64748B', '#475569'] },
};

export default function EmptyState({
  icon,
  title,
  subtitle,
  action,
  variant = 'green',
  compact = false,
}: EmptyStateProps) {
  const p = PALETTE[variant];

  return (
    <Animated.View entering={FadeInUp.duration(380).springify()} style={[st.wrap, compact && st.wrapCompact]}>
      <LinearGradient colors={p.bg as [string, string]} style={[st.card, compact && st.cardCompact]}>
        {/* Icon ring */}
        <View style={[st.iconOuter, { borderColor: p.ring }]}>
          <View style={[st.iconInner, { backgroundColor: p.ring }]}>
            <Ionicons name={icon} size={compact ? 26 : 32} color={p.icon} />
          </View>
        </View>

        <Text style={[st.title, compact && st.titleCompact]}>{title}</Text>
        {subtitle ? <Text style={[st.subtitle, compact && st.subtitleCompact]}>{subtitle}</Text> : null}

        {action && (
          <TouchableOpacity onPress={action.onPress} activeOpacity={0.82} style={st.btnWrap}>
            <LinearGradient colors={p.btn as [string, string]} style={st.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={st.btnText}>{action.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.lg, marginVertical: Spacing.sm },
  wrapCompact: { marginHorizontal: Spacing.lg, marginVertical: 4 },

  card: {
    borderRadius: Radius.lg,
    paddingVertical: 40,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  cardCompact: { paddingVertical: 28 },

  iconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  titleCompact: { fontSize: FontSize.body },

  subtitle: {
    fontSize: FontSize.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  subtitleCompact: { fontSize: FontSize.caption },

  btnWrap: { marginTop: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  btn: { paddingVertical: 11, paddingHorizontal: 28 },
  btnText: { color: '#FFF', fontSize: FontSize.small, fontWeight: '700' },
});
