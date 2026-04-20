import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withDelay, withRepeat, Easing,
} from 'react-native-reanimated';
import { Colors, Radius } from '@/src/theme';

const FACE_SIZE = 52;

// Baby stock photos for each mood state (royalty-free from Unsplash/Pexels)
const MOOD_BABY_PHOTOS = [
  {
    uri: 'https://images.pexels.com/photos/3617844/pexels-photo-3617844.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    alt: 'Sad baby crying with tears, expressing very low mood',
    source: 'Pexels',
    license: 'Pexels License (free for personal and commercial use)',
  },
  {
    uri: 'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=150&h=150&fit=crop&crop=face',
    alt: 'Worried baby frowning with wide eyes, expressing low mood',
    source: 'Unsplash',
    license: 'Unsplash License (free for commercial and non-commercial use)',
  },
  {
    uri: 'https://images.unsplash.com/photo-1496174742515-d2146dcf8e80?w=150&h=150&fit=crop&crop=face',
    alt: 'Peaceful baby sleeping calmly, expressing neutral mood',
    source: 'Unsplash',
    license: 'Unsplash License (free for commercial and non-commercial use)',
  },
  {
    uri: 'https://images.unsplash.com/photo-1617331140180-e8262094733a?w=150&h=150&fit=crop&crop=face',
    alt: 'Happy baby smiling joyfully, expressing good mood',
    source: 'Unsplash',
    license: 'Unsplash License (free for commercial and non-commercial use)',
  },
  {
    uri: 'https://images.unsplash.com/photo-1552788960-65fcafe071a5?w=150&h=150&fit=crop&crop=face',
    alt: 'Ecstatic baby laughing with delight, expressing great mood',
    source: 'Unsplash',
    license: 'Unsplash License (free for commercial and non-commercial use)',
  },
];

export const MOOD_LABELS = ['Very Low', 'Low', 'Neutral', 'Good', 'Great'];
export const MOOD_COLORS = ['#7B8CDE', '#F4A261', '#F59E0B', '#22C55E', '#A855F7'];

// ============ ANIMATED MOOD EMOJI COMPONENT ============
export default function MoodEmoji({
  index, isSelected, onPress,
}: {
  index: number; isSelected: boolean; onPress: () => void;
}) {
  const photo = MOOD_BABY_PHOTOS[index];
  const color = MOOD_COLORS[index];
  const label = MOOD_LABELS[index];

  const scale = useSharedValue(0);
  const bounce = useSharedValue(1);
  const rotation = useSharedValue(0);
  const floatY = useSharedValue(0);

  // Entry animation
  useEffect(() => {
    scale.value = withDelay(
      index * 100,
      withSpring(1, { damping: 8, stiffness: 120 })
    );
    floatY.value = withDelay(
      index * 100 + 500,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(3, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
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
      accessibilityLabel={photo.alt}
      accessibilityRole="button"
      style={[
        styles.emojiBtn,
        isSelected && { backgroundColor: color + '18', borderColor: color, borderWidth: 2.5 },
      ]}
    >
      <Animated.View style={animStyle}>
        <Image
          source={{ uri: photo.uri }}
          style={styles.babyPhoto}
          contentFit="cover"
          transition={200}
          accessibilityLabel={photo.alt}
        />
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
  babyPhoto: {
    width: FACE_SIZE,
    height: FACE_SIZE,
    borderRadius: FACE_SIZE / 2,
  },
});
