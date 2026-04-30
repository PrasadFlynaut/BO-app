import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
// Conditional require: Metro dead-code-eliminates this on web (Platform.OS is
// a compile-time constant). restaurant-map.web.tsx handles the web render path.
const _maps = Platform.OS !== 'web' ? require('react-native-maps') : {};
const MapView: any = _maps.default;
const Marker: any = _maps.Marker;
const PROVIDER_GOOGLE: any = _maps.PROVIDER_GOOGLE;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';
import FallbackImage from '@/src/components/FallbackImage';

export default function RestaurantMapScreen() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const latitude = parseFloat(lat || '0') || 37.7749;
  const longitude = parseFloat(lng || '0') || -122.4194;

  useEffect(() => {
    api.get('/restaurants?limit=20&sort=rating')
      .then(({ data }) => setRestaurants(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (r: any) => {
    setSelected(r);
    if (r.latitude && r.longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: r.latitude,
        longitude: r.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  return (
    <View style={st.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings
      >
        {restaurants.map((r) =>
          r.latitude && r.longitude ? (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitude, longitude: r.longitude }}
              onPress={() => handleSelect(r)}
            >
              <View style={[st.markerPin, selected?.id === r.id && st.markerPinActive]}>
                <Ionicons name="restaurant" size={13} color="#FFF" />
              </View>
            </Marker>
          ) : null
        )}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView style={st.headerWrap} pointerEvents="box-none">
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

      {/* Bottom sheet */}
      <Animated.View entering={FadeInUp.duration(400)} style={[st.bottomSheet, Shadow.lg]}>
        {loading ? (
          <ActivityIndicator color={Colors.green} style={{ paddingVertical: 24 }} />
        ) : (
          <>
            <View style={st.sheetHandle} />
            <Text style={st.sheetTitle}>
              {restaurants.length} Restaurants Near You
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.cardScroll}
              decelerationRate="fast"
              snapToInterval={232}
            >
              {restaurants.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[st.restCard, selected?.id === r.id && st.restCardSelected]}
                  onPress={() => handleSelect(r)}
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
                    <Text style={st.restCuisine} numberOfLines={1}>{(r.cuisines || []).join(', ')}</Text>
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
              ))}
            </ScrollView>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  headerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: Radius.pill, paddingVertical: 10, paddingHorizontal: 16 },
  headerText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },

  // Marker
  markerPin: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#FFF', ...Shadow.sm },
  markerPinActive: { backgroundColor: Colors.greenDark, width: 40, height: 40, borderRadius: 20 },

  // Bottom sheet
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 32 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, marginBottom: 12 },
  cardScroll: { paddingHorizontal: Spacing.lg, gap: 12 },

  // Restaurant card
  restCard: { width: 220, backgroundColor: '#FFF', borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.borderLight },
  restCardSelected: { borderColor: Colors.green, ...Shadow.sm },
  restImg: { width: '100%', height: 110 },
  verifiedBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 8 },
  verifiedText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  cardBody: { padding: 12 },
  restName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  restCuisine: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: FontSize.small, fontWeight: '700', color: Colors.textPrimary },
  distText: { fontSize: FontSize.small, color: Colors.textTertiary },
  detailBtn: { marginTop: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  detailBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9 },
  detailBtnText: { color: '#FFF', fontSize: FontSize.small, fontWeight: '700' },
});
