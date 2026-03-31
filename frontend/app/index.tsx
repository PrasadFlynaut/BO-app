import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useAuth } from '@/src/auth';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
    title: "Treat yourself,\ndon't cheat yourself!",
    subtitle: 'Your wellness journey starts here',
    accent: Colors.green,
    gradientColors: ['rgba(38,181,15,0.0)', 'rgba(38,181,15,0.85)'] as [string, string],
  },
  {
    id: '2',
    image: 'https://images.pexels.com/photos/7991909/pexels-photo-7991909.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: "Let's redefine\nhealthy food together!",
    subtitle: 'AI-powered meal plans tailored to you',
    accent: Colors.nutritionOrange,
    gradientColors: ['rgba(255,159,28,0.0)', 'rgba(255,159,28,0.85)'] as [string, string],
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1768734836079-040ec2543a65?w=800&q=80',
    title: "Fun fact: BO stands\nfor Bananas & Okra",
    subtitle: 'Inspired by two matriarchs',
    accent: Colors.fitnessPurple,
    gradientColors: ['rgba(131,56,236,0.0)', 'rgba(131,56,236,0.85)'] as [string, string],
  },
  {
    id: '4',
    image: 'https://images.pexels.com/photos/28315995/pexels-photo-28315995.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: "A culinary blueprint\nfor a better you",
    subtitle: 'Track, learn, and thrive',
    accent: Colors.socialTeal,
    gradientColors: ['rgba(6,214,160,0.0)', 'rgba(6,214,160,0.85)'] as [string, string],
  },
];

export default function SplashScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_seen').then(val => {
      setOnboardingSeen(val === 'true');
    });
  }, []);

  useEffect(() => {
    if (loading || onboardingSeen === null) return;
    if (onboardingSeen && user) {
      if (!user.onboarding_complete) {
        router.replace('/(onboarding)/goals');
      } else {
        router.replace('/(tabs)/home');
      }
    } else if (onboardingSeen && !user) {
      router.replace('/(auth)/login');
    }
  }, [loading, user, onboardingSeen]);

  const goNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('onboarding_seen', 'true');
      router.replace('/(auth)/login');
    }
  };

  const skip = async () => {
    await AsyncStorage.setItem('onboarding_seen', 'true');
    router.replace('/(auth)/login');
  };

  const onPressIn = () => {
    buttonScale.value = withSpring(0.9, { stiffness: 300, damping: 15 });
  };
  const onPressOut = () => {
    buttonScale.value = withSpring(1, { stiffness: 300, damping: 15 });
  };
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (onboardingSeen === null || loading) return <View style={styles.container} />;
  if (onboardingSeen) return <View style={styles.container} />;

  const currentSlide = SLIDES[currentIndex];

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={styles.slide}>
      <View style={styles.imageCard}>
        <Image source={{ uri: item.image }} style={styles.slideImage} resizeMode="cover" />
        <LinearGradient
          colors={item.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.imageGradient}
        />
        <View style={styles.textOverlay}>
          <Animated.View entering={FadeInUp.duration(500)}>
            <View style={[styles.accentBadge, { backgroundColor: item.accent + '25' }]}>
              <View style={[styles.accentDot, { backgroundColor: item.accent }]} />
              <Text style={[styles.accentBadgeText, { color: item.accent }]}>BO Wellness</Text>
            </View>
          </Animated.View>
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={{ flex: 1 }}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.footer}>
        <TouchableOpacity testID="splash-skip" onPress={skip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.pagination}>
          {SLIDES.map((slide, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.dotActive, { backgroundColor: currentSlide.accent }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <Animated.View style={buttonAnimStyle}>
          <TouchableOpacity
            testID="splash-next"
            onPress={goNext}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[currentSlide.accent, Colors.greenDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextBtn}
            >
              <Ionicons
                name={currentIndex === SLIDES.length - 1 ? 'checkmark' : 'chevron-forward'}
                size={24}
                color="#FFF"
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  slide: { width, paddingHorizontal: 12, paddingTop: 8 },
  imageCard: {
    height: height * 0.74,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: 12,
  },
  slideImage: { width: '100%', height: '100%' },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textOverlay: { position: 'absolute', top: 24, left: 20, right: 20 },
  accentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
  },
  accentDot: { width: 8, height: 8, borderRadius: 4 },
  accentBadgeText: { fontSize: FontSize.caption, fontWeight: '700', letterSpacing: 1 },
  bottomOverlay: { position: 'absolute', bottom: 28, left: 20, right: 20 },
  slideTitle: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.body,
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 28 },
  dotInactive: { width: 6, backgroundColor: Colors.textTertiary + '50' },
  nextBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
});
