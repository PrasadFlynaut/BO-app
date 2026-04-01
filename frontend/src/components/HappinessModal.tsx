import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Modal, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withDelay, withRepeat, FadeIn, FadeInDown,
  FadeInUp, SlideInDown, runOnJS, Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import api from '@/src/api';

const { width: SW } = Dimensions.get('window');

const MOOD_EMOJIS = ['\u{1F622}', '\u{1F61E}', '\u{1F610}', '\u{1F60A}', '\u{1F929}'];
const MOOD_LABELS = ['Very Low', 'Low', 'Neutral', 'Good', 'Great'];
const MOOD_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#A855F7'];
const FACTORS = ['sleep', 'nutrition', 'exercise', 'social', 'work', 'family'];
const FACTOR_ICONS: Record<string, string> = {
  sleep: '\u{1F634}', nutrition: '\u{1F957}', exercise: '\u{1F3CB}',
  social: '\u{1F465}', work: '\u{1F4BC}', family: '\u{2764}\u{FE0F}',
};

interface HappinessModalProps {
  visible: boolean;
  onClose: () => void;
  onLogged: () => void;
}

// Animated Emoji Button
function AnimatedEmoji({
  emoji, label, color, index, isSelected, onPress,
}: {
  emoji: string; label: string; color: string; index: number;
  isSelected: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(0);
  const bounce = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Entry animation - staggered bounce in
  useEffect(() => {
    scale.value = withDelay(
      index * 80,
      withSpring(1, { damping: 8, stiffness: 120 })
    );
  }, []);

  // Selection animation
  useEffect(() => {
    if (isSelected) {
      // Big bounce + wiggle
      bounce.value = withSequence(
        withSpring(1.3, { damping: 4, stiffness: 200 }),
        withSpring(1.15, { damping: 6, stiffness: 150 })
      );
      rotation.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 80 }),
        withTiming(-5, { duration: 60 }),
        withTiming(5, { duration: 60 }),
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
    ],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.emojiBtn,
        isSelected && { backgroundColor: color + '15', borderColor: color, borderWidth: 2.5 },
      ]}
    >
      <Animated.View style={animStyle}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </Animated.View>
      <Text style={[
        styles.emojiLabel,
        isSelected && { color, fontWeight: '700' },
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HappinessModal({ visible, onClose, onLogged }: HappinessModalProps) {
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState('');
  const [factors, setFactors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<{ quote: string; author: string } | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  // Quote animation
  const quoteOpacity = useSharedValue(0);
  const quoteTranslateY = useSharedValue(15);

  const resetState = () => {
    setLevel(0);
    setNote('');
    setFactors([]);
    setQuote(null);
    quoteOpacity.value = 0;
    quoteTranslateY.value = 15;
  };

  // Fetch a motivational quote when mood is selected
  const fetchQuote = useCallback(async (moodLevel: number) => {
    setLoadingQuote(true);
    try {
      const { data } = await api.get(`/v1/happiness/quote?level=${moodLevel}`);
      setQuote(data);
      // Animate quote in
      quoteOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
      quoteTranslateY.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 100 }));
    } catch {
      // Fallback quotes
      const fallback = [
        { quote: "Every day is a new beginning.", author: "Unknown" },
        { quote: "You are capable of amazing things.", author: "Unknown" },
        { quote: "Believe in the power of your journey.", author: "Unknown" },
      ];
      setQuote(fallback[Math.floor(Math.random() * fallback.length)]);
      quoteOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
      quoteTranslateY.value = withDelay(200, withSpring(0, { damping: 12 }));
    }
    setLoadingQuote(false);
  }, []);

  const selectMood = (idx: number) => {
    const newLevel = idx + 1;
    setLevel(newLevel);
    // Reset quote animation
    quoteOpacity.value = 0;
    quoteTranslateY.value = 15;
    fetchQuote(newLevel);
  };

  const toggleFactor = (f: string) => {
    setFactors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const saveHappiness = async () => {
    if (level === 0) return;
    setSaving(true);
    try {
      await api.post('/v1/happiness', { level, note, factors });
      onLogged();
      resetState();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleSkip = () => {
    onClose();
    resetState();
  };

  const quoteAnimStyle = useAnimatedStyle(() => ({
    opacity: quoteOpacity.value,
    transform: [{ translateY: quoteTranslateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <Text style={styles.title}>How are you feeling?</Text>
          <Text style={styles.subtitle}>Track your daily mood to see patterns over time</Text>

          {/* Emoji Row */}
          <View style={styles.emojiRow}>
            {MOOD_EMOJIS.map((emoji, i) => (
              <AnimatedEmoji
                key={i}
                emoji={emoji}
                label={MOOD_LABELS[i]}
                color={MOOD_COLORS[i]}
                index={i}
                isSelected={level === i + 1}
                onPress={() => selectMood(i)}
              />
            ))}
          </View>

          {/* Motivational Quote */}
          {level > 0 && (
            <Animated.View style={[styles.quoteCard, quoteAnimStyle]}>
              {loadingQuote ? (
                <ActivityIndicator size="small" color={Colors.green} />
              ) : quote ? (
                <>
                  <Text style={styles.quoteIcon}>{'\u2728'}</Text>
                  <Text style={styles.quoteText}>"{quote.quote}"</Text>
                  {quote.author && quote.author !== 'Unknown' && (
                    <Text style={styles.quoteAuthor}>— {quote.author}</Text>
                  )}
                </>
              ) : null}
            </Animated.View>
          )}

          {/* Factors */}
          {level > 0 && (
            <Animated.View entering={FadeInDown.delay(300).duration(350)}>
              <Text style={styles.factorTitle}>What influenced your mood?</Text>
              <View style={styles.factorRow}>
                {FACTORS.map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => toggleFactor(f)}
                    style={[styles.factorChip, factors.includes(f) && styles.factorChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.factorIcon}>{FACTOR_ICONS[f]}</Text>
                    <Text style={[styles.factorText, factors.includes(f) && styles.factorTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Note */}
          {level > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(350)}>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note (optional)..."
                placeholderTextColor={Colors.textTertiary}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </Animated.View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveHappiness}
              style={[styles.saveBtn, level === 0 && { opacity: 0.4 }]}
              disabled={level === 0 || saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveText}>
                  {level > 0 ? `Log ${MOOD_LABELS[level - 1]} Mood` : 'Log Mood'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26, fontWeight: '800', color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.small, color: Colors.textTertiary,
    textAlign: 'center', marginTop: 6, marginBottom: Spacing.xl,
  },
  emojiRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    gap: 4, marginBottom: Spacing.md,
  },
  emojiBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: Radius.lg, backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#F3F4F6',
  },
  emojiText: { fontSize: 36 },
  emojiLabel: {
    fontSize: 11, color: Colors.textTertiary,
    marginTop: 6, fontWeight: '500',
  },
  quoteCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  quoteIcon: { fontSize: 18, marginBottom: 4 },
  quoteText: {
    fontSize: FontSize.body, color: Colors.textPrimary,
    fontStyle: 'italic', textAlign: 'center', lineHeight: 22,
    fontWeight: '500',
  },
  quoteAuthor: {
    fontSize: FontSize.caption, color: Colors.textTertiary,
    marginTop: 6, fontWeight: '600',
  },
  factorTitle: {
    fontSize: FontSize.small, fontWeight: '600',
    color: Colors.textSecondary, marginBottom: Spacing.sm,
  },
  factorRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginBottom: Spacing.md,
  },
  factorChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.pill, backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  factorChipActive: {
    backgroundColor: Colors.greenLight,
    borderColor: Colors.green,
  },
  factorIcon: { fontSize: 14 },
  factorText: {
    fontSize: FontSize.caption, color: Colors.textSecondary,
    textTransform: 'capitalize', fontWeight: '500',
  },
  factorTextActive: {
    color: Colors.green, fontWeight: '700',
  },
  noteInput: {
    backgroundColor: '#F9FAFB', borderRadius: Radius.lg,
    padding: 14, fontSize: FontSize.body, color: Colors.textPrimary,
    minHeight: 56, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row', gap: Spacing.md, marginTop: 4,
  },
  skipBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: Radius.lg, backgroundColor: '#F3F4F6',
  },
  skipText: {
    color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.body,
  },
  saveBtn: {
    flex: 2, alignItems: 'center', paddingVertical: 14,
    borderRadius: Radius.lg, backgroundColor: Colors.green,
  },
  saveText: {
    color: '#FFF', fontWeight: '700', fontSize: FontSize.body,
  },
});
