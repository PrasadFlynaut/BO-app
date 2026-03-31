import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
    title: "Treat yourself don't\ncheat yourself!",
  },
  {
    id: '2',
    image: 'https://images.pexels.com/photos/7991909/pexels-photo-7991909.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: "Let's redefine healthy\nfood together!",
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1768734836079-040ec2543a65?w=800&q=80',
    title: "Fun fact:\nBO was inspired by\ntwo matriarchs and\nstands for Bananas\n& Okra",
  },
  {
    id: '4',
    image: 'https://images.pexels.com/photos/28315995/pexels-photo-28315995.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: "Bananas & Okra,\nA culinary blueprint\nfor a better you",
  },
];

export default function SplashScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

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

  if (onboardingSeen === null || loading) return <View style={styles.container} />;
  if (onboardingSeen) return <View style={styles.container} />;

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={styles.slide}>
      <View style={styles.imageCard}>
        <Image source={{ uri: item.image }} style={styles.slideImage} resizeMode="cover" />
        <View style={styles.textOverlay}>
          <Text style={styles.slideTitle}>{item.title}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
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
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity testID="splash-skip" onPress={skip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>

        <TouchableOpacity testID="splash-next" style={styles.nextBtn} onPress={goNext} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  slide: { width, paddingHorizontal: 16, paddingTop: 8 },
  imageCard: { height: height * 0.72, borderRadius: 24, overflow: 'hidden', marginBottom: 16, backgroundColor: '#2C2C2C' },
  slideImage: { width: '100%', height: '100%' },
  textOverlay: { position: 'absolute', top: 32, left: 24, right: 24 },
  slideTitle: { color: '#FFF', fontSize: 28, fontWeight: '700', lineHeight: 36 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  skipText: { color: '#1A1A1A', fontSize: 16, fontWeight: '700' },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 32, backgroundColor: '#26B50F' },
  dotInactive: { width: 6, backgroundColor: '#D0D0D0' },
  nextBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#26B50F', alignItems: 'center', justifyContent: 'center' },
});
