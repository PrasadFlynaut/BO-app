import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/src/theme';

const TOTAL_STEPS = 7;

export default function OnboardingProgress({ step }: { step: number }) {
  return (
    <View style={st.wrap}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            st.bar,
            i < step - 1 && st.barDone,
            i === step - 1 && st.barActive,
          ]}
        />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4, marginBottom: Spacing.lg },
  bar: { flex: 1, height: 4, borderRadius: Radius.pill, backgroundColor: Colors.borderLight },
  barDone: { backgroundColor: Colors.green + '70' },
  barActive: { backgroundColor: Colors.green },
});
