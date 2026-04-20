import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';
import { useAuth } from '@/src/auth';

export default function CompleteScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [completing, setCompleting] = React.useState(true);
  const checkScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  useEffect(() => {
    const finalize = async () => {
      try {
        await api.post('/onboarding/complete');
        await refreshUser();
      } catch (e) { console.error(e); }
      setCompleting(false);
      checkScale.value = withSpring(1, { stiffness: 200, damping: 12 });
      confettiOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    };
    finalize();
  }, []);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
  const confettiStyle = useAnimatedStyle(() => ({ opacity: confettiOpacity.value }));

  if (completing) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.center}>
          <ActivityIndicator size="large" color={Colors.green} />
          <Text style={st.loadingText}>Setting up your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.container}>
        <Animated.View entering={FadeIn.duration(800)} style={st.content}>
          {/* Success check */}
          <Animated.View style={[st.checkCircleOuter, checkStyle]}>
            <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.checkCircle}>
              <Ionicons name="checkmark" size={48} color="#FFF" />
            </LinearGradient>
          </Animated.View>

          {/* Confetti badges */}
          <Animated.View style={[st.confettiRow, confettiStyle]}>
            {['trophy', 'star', 'heart', 'ribbon'].map((icon, i) => (
              <Animated.View key={icon} entering={FadeInDown.delay(400 + i * 100).duration(400)}>
                <View style={[st.confettiIcon, { backgroundColor: [Colors.nutritionSurface, Colors.waterSurface, Colors.fitnessSurface, Colors.socialSurface][i] }]}>
                  <Ionicons name={icon as any} size={20} color={[Colors.nutritionOrange, Colors.waterBlue, Colors.fitnessPurple, Colors.socialTeal][i]} />
                </View>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(500).duration(600)}>
            <Text style={st.title}>You are All Set!</Text>
            <Text style={st.subtitle}>Your personalized wellness journey is ready. Let's get started!</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(800).duration(500)}>
            <View style={st.statsRow}>
              <View style={st.statCard}>
                <Ionicons name="flame" size={20} color={Colors.nutritionOrange} />
                <Text style={st.statLabel}>Personalized</Text>
                <Text style={st.statValue}>Meal Planter</Text>
              </View>
              <View style={st.statCard}>
                <Ionicons name="trending-up" size={20} color={Colors.green} />
                <Text style={st.statLabel}>Smart</Text>
                <Text style={st.statValue}>Tracking</Text>
              </View>
              <View style={st.statCard}>
                <Ionicons name="sparkles" size={20} color={Colors.fitnessPurple} />
                <Text style={st.statLabel}>AI</Text>
                <Text style={st.statValue}>Coaching</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1000).duration(500)} style={st.footer}>
          <TouchableOpacity testID="get-rolling" onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.lime, Colors.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.button, Shadow.lg]}>
              <Ionicons name="rocket-outline" size={22} color={Colors.textPrimary} />
              <Text style={st.buttonText}>Get Rolling!</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: FontSize.body, color: Colors.textSecondary },
  container: { flex: 1, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  checkCircleOuter: { marginBottom: Spacing.lg },
  checkCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  confettiRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  confettiIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.h1, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 24, paddingHorizontal: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: Colors.bgBase, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight },
  statLabel: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 6 },
  statValue: { fontSize: FontSize.small, fontWeight: '700', color: Colors.textPrimary },
  footer: { padding: Spacing.lg },
  button: { borderRadius: Radius.pill, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  buttonText: { color: Colors.textPrimary, fontSize: FontSize.h4, fontWeight: '800' },
});
