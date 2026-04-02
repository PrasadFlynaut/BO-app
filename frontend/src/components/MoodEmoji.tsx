import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withDelay, withRepeat, Easing,
} from 'react-native-reanimated';
import { Colors, Radius } from '@/src/theme';

const FACE_SIZE = 52;

// ============ CUSTOM MOOD FACES (SVG) ============

function StormyFace() {
  return (
    <Svg width={FACE_SIZE} height={FACE_SIZE} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="g1" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor="#B8C6FF" />
          <Stop offset="100%" stopColor="#7B8CDE" />
        </RadialGradient>
      </Defs>
      <Circle cx="30" cy="32" r="24" fill="url(#g1)" />
      {/* Droopy eyes */}
      <Ellipse cx="21" cy="30" rx="3.5" ry="4" fill="#4A5568" />
      <Ellipse cx="39" cy="30" rx="3.5" ry="4" fill="#4A5568" />
      <Circle cx="20" cy="29" r="1.2" fill="#FFF" />
      <Circle cx="38" cy="29" r="1.2" fill="#FFF" />
      {/* Sad eyebrows */}
      <Path d="M15 24 Q18 21 24 24" stroke="#4A5568" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M36 24 Q42 21 45 24" stroke="#4A5568" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Wavy frown */}
      <Path d="M20 40 Q25 36 30 38 Q35 40 40 36" stroke="#4A5568" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Tear drop */}
      <Path d="M22 35 Q21 39 22 41 Q23 43 24 41 Q25 39 24 35 Z" fill="#60A5FA" opacity="0.7" />
      {/* Rain cloud */}
      <G opacity="0.5">
        <Ellipse cx="42" cy="12" rx="8" ry="5" fill="#94A3B8" />
        <Ellipse cx="48" cy="13" rx="5" ry="4" fill="#94A3B8" />
        <Path d="M38 16 L37 20" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" />
        <Path d="M43 17 L42 21" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" />
        <Path d="M48 16 L47 20" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function WorriedFace() {
  return (
    <Svg width={FACE_SIZE} height={FACE_SIZE} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="g2" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor="#FED7AA" />
          <Stop offset="100%" stopColor="#F4A261" />
        </RadialGradient>
      </Defs>
      <Circle cx="30" cy="32" r="24" fill="url(#g2)" />
      {/* Worried eyes - oval */}
      <Ellipse cx="22" cy="30" rx="3" ry="4.5" fill="#4A5568" />
      <Ellipse cx="38" cy="30" rx="3" ry="4.5" fill="#4A5568" />
      <Circle cx="21.5" cy="29" r="1.3" fill="#FFF" />
      <Circle cx="37.5" cy="29" r="1.3" fill="#FFF" />
      {/* Worried raised eyebrows */}
      <Path d="M16 22 Q20 18 26 22" stroke="#7C5B3A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M34 22 Q40 18 44 22" stroke="#7C5B3A" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Slight frown */}
      <Path d="M22 42 Q30 38 38 42" stroke="#7C5B3A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Sweat drop */}
      <Ellipse cx="47" cy="24" rx="2" ry="3" fill="#87CEEB" opacity="0.6" />
    </Svg>
  );
}

function ZenFace() {
  return (
    <Svg width={FACE_SIZE} height={FACE_SIZE} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="g3" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor="#FEF3C7" />
          <Stop offset="100%" stopColor="#F59E0B" />
        </RadialGradient>
      </Defs>
      <Circle cx="30" cy="32" r="24" fill="url(#g3)" />
      {/* Zen closed eyes - curved lines */}
      <Path d="M17 30 Q22 27 27 30" stroke="#78350F" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Path d="M33 30 Q38 27 43 30" stroke="#78350F" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Neutral flat mouth */}
      <Path d="M23 41 L37 41" stroke="#78350F" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Blush spots */}
      <Circle cx="16" cy="36" r="4" fill="#FBBF24" opacity="0.4" />
      <Circle cx="44" cy="36" r="4" fill="#FBBF24" opacity="0.4" />
    </Svg>
  );
}

function HappyFace() {
  return (
    <Svg width={FACE_SIZE} height={FACE_SIZE} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="g4" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor="#BBF7D0" />
          <Stop offset="100%" stopColor="#22C55E" />
        </RadialGradient>
      </Defs>
      <Circle cx="30" cy="32" r="24" fill="url(#g4)" />
      {/* Happy curved eyes */}
      <Path d="M17 28 Q22 24 27 28" stroke="#14532D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M33 28 Q38 24 43 28" stroke="#14532D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Big smile */}
      <Path d="M19 38 Q30 50 41 38" stroke="#14532D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Sparkle cheeks */}
      <Circle cx="15" cy="35" r="4.5" fill="#86EFAC" opacity="0.5" />
      <Circle cx="45" cy="35" r="4.5" fill="#86EFAC" opacity="0.5" />
      {/* Small sparkle */}
      <G opacity="0.6">
        <Path d="M48 16 L48 10" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M45 13 L51 13" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function EcstaticFace() {
  return (
    <Svg width={FACE_SIZE} height={FACE_SIZE} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="g5" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor="#E9D5FF" />
          <Stop offset="100%" stopColor="#A855F7" />
        </RadialGradient>
      </Defs>
      <Circle cx="30" cy="32" r="24" fill="url(#g5)" />
      {/* Star eyes */}
      <Path d="M22 28 L20 24 L18 28 L14 28 L17 31 L16 35 L20 32 L24 35 L23 31 L26 28 Z" fill="#FDE047" />
      <Path d="M40 28 L38 24 L36 28 L32 28 L35 31 L34 35 L38 32 L42 35 L41 31 L44 28 Z" fill="#FDE047" />
      {/* Open excited mouth */}
      <Path d="M20 40 Q30 52 40 40 Q35 44 30 44 Q25 44 20 40 Z" fill="#7C3AED" opacity="0.3" />
      <Path d="M20 40 Q30 52 40 40" stroke="#581C87" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Crown / sparkles */}
      <G>
        <Path d="M18 10 L20 6 L22 10" stroke="#FDE047" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <Path d="M28 7 L30 3 L32 7" stroke="#FDE047" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <Path d="M38 10 L40 6 L42 10" stroke="#FDE047" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </G>
      {/* Side sparkles */}
      <G opacity="0.7">
        <Path d="M6 28 L4 26 M4 28 L6 26" stroke="#C084FC" strokeWidth="1.2" strokeLinecap="round" />
        <Path d="M54 28 L52 26 M52 28 L54 26" stroke="#C084FC" strokeWidth="1.2" strokeLinecap="round" />
        <Circle cx="8" cy="18" r="1.5" fill="#FDE047" />
        <Circle cx="52" cy="18" r="1.5" fill="#FDE047" />
      </G>
    </Svg>
  );
}

const MOOD_FACES = [StormyFace, WorriedFace, ZenFace, HappyFace, EcstaticFace];
export const MOOD_LABELS = ['Very Low', 'Low', 'Neutral', 'Good', 'Great'];
export const MOOD_COLORS = ['#7B8CDE', '#F4A261', '#F59E0B', '#22C55E', '#A855F7'];

// ============ ANIMATED MOOD EMOJI COMPONENT ============
export default function MoodEmoji({
  index, isSelected, onPress,
}: {
  index: number; isSelected: boolean; onPress: () => void;
}) {
  const FaceComponent = MOOD_FACES[index];
  const color = MOOD_COLORS[index];
  const label = MOOD_LABELS[index];

  const scale = useSharedValue(0);
  const bounce = useSharedValue(1);
  const rotation = useSharedValue(0);
  const floatY = useSharedValue(0);

  // Entry animation - staggered bounce in
  useEffect(() => {
    scale.value = withDelay(
      index * 100,
      withSpring(1, { damping: 8, stiffness: 120 })
    );
    // Gentle floating animation
    floatY.value = withDelay(
      index * 100 + 500,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(3, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1, // infinite
        true
      )
    );
  }, []);

  // Selection animation
  useEffect(() => {
    if (isSelected) {
      bounce.value = withSequence(
        withSpring(1.35, { damping: 4, stiffness: 200 }),
        withSpring(1.15, { damping: 6, stiffness: 150 })
      );
      rotation.value = withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming(10, { duration: 80 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 80 })
      );
    } else {
      bounce.value = withSpring(1, { damping: 10 });
      rotation.value = withTiming(0, { duration: 150 });
    }
  }, [isSelected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * bounce.value },
      { rotate: `${rotation.value}deg` },
      { translateY: floatY.value },
    ],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.emojiBtn,
        isSelected && { backgroundColor: color + '18', borderColor: color, borderWidth: 2.5 },
      ]}
    >
      <Animated.View style={animStyle}>
        <FaceComponent />
      </Animated.View>
      <Text style={[
        styles.emojiLabel,
        isSelected && { color, fontWeight: '700' },
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  emojiBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    minHeight: 90,
    justifyContent: 'center',
  },
  emojiLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
    fontWeight: '500',
  },
});
