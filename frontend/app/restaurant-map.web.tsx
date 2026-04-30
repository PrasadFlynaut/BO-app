import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';
import FallbackImage from '@/src/components/FallbackImage';

export default function RestaurantMapScreen() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const latitude = parseFloat(lat || '0') || 37.7749;
  const longitude = parseFloat(lng || '0') || -122.4194;

  useEffect(() => {
    api.get('/restaurants?limit=20&sort=rating')
      .then(({ data }) => setRestaurants(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.05},${latitude - 0.05},${longitude + 0.05},${latitude + 0.05}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <View style={st.container}>
      {/* Header */}
      <SafeAreaView style={st.headerWrap}>
        <Animated.View entering={FadeInDown.duration(400)} style={st.headerRow}>
          <TouchableOpacity style={[st.headerBtn, Shadow.sm]} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={[st.headerPill, Shadow.sm]}>
            <Ionicons name="map" size={16} color={Colors.green} />
            <Text style={st.headerText}>Nearby Restaurants</Text>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* OpenStreetMap embed */}
        <View style={st.mapWrap}>
          <iframe
            src={mapEmbedUrl}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 } as any}
            title="Nearby Restaurants Map"
          />
        </View>

        {/* Restaurant list */}
        <Text style={st.listTitle}>
          {loading ? 'Loading...' : `${restaurants.length} Restaurants Near You`}
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={{ paddingVertical: 32 }} />
        ) : (
          restaurants.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[st.restCard, Shadow.sm]}
              onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
              activeOpacity={0.85}
            >
              <FallbackImage uri={r.image_url} style={st.restImg} />
              {r.bo_verified && (
                <View style={st.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                  <Text style={st.verifiedText}>BO Verified</Text>
                </View>
              )}
              <View style={st.cardBody}>
                <Text style={st.restName} numberOfLines={1}>{r.name}</Text>
                <Text style={st.restCuisine} numberOfLines={1}>{(r.cuisines || [r.cuisine]).filter(Boolean).join(', ')}</Text>
                <View style={st.metaRow}>
                  <View style={st.ratingRow}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={st.ratingText}>{r.average_rating || '0.0'}</Text>
                  </View>
                  {r.distance_miles ? <Text style={st.distText}>{r.distance_miles} mi</Text> : null}
                </View>
                <TouchableOpacity
                  style={st.detailBtn}
                  onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.detailBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={st.detailBtnText}>View Details</Text>
                    <Ionicons name="arrow-forward" size={13} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  headerWrap: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  headerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgBase, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  headerText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },

  scroll: { paddingBottom: 40 },

  mapWrap: { height: 300, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },

  listTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  restCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#FFF', flexDirection: 'row' },
  restImg: { width: 100, height: 100 },
  verifiedBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 6 },
  verifiedText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  cardBody: { flex: 1, padding: 12 },
  restName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  restCuisine: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: FontSize.small, fontWeight: '700', color: Colors.textPrimary },
  distText: { fontSize: FontSize.small, color: Colors.textTertiary },
  detailBtn: { marginTop: 8, borderRadius: Radius.pill, overflow: 'hidden', alignSelf: 'flex-start' },
  detailBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14 },
  detailBtnText: { color: '#FFF', fontSize: FontSize.small, fontWeight: '700' },
});
