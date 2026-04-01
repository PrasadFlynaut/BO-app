import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { boLogoColor } from '@/src/assets';
import api from '@/src/api';

type Restaurant = { id: string; name: string; cuisine: string; address: string; rating: number; bo_verified: boolean; bo_partner: boolean; image_url?: string };

export default function ClaimRestaurantScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'search' | 'claim' | 'submitted'>('search');
  const [search, setSearch] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [businessDoc, setBusinessDoc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myClaims, setMyClaims] = useState<any[]>([]);

  useFocusEffect(useCallback(() => { loadMyClaims(); }, []));

  const loadMyClaims = async () => {
    try {
      const { data } = await api.get('/v1/restaurants/claims/mine');
      setMyClaims(data.claims || []);
    } catch (e) { console.error(e); }
  };

  const searchRestaurants = async () => {
    if (search.trim().length < 2) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/restaurants?limit=20&search=${encodeURIComponent(search.trim())}`);
      setRestaurants(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const selectRestaurant = (r: Restaurant) => {
    setSelected(r);
    setStep('claim');
  };

  const submitClaim = async () => {
    if (!ownerName.trim() || !ownerEmail.trim() || !ownerPhone.trim()) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/v1/restaurants/claims', {
        restaurant_id: selected?.id,
        owner_name: ownerName.trim(),
        owner_email: ownerEmail.trim(),
        owner_phone: ownerPhone.trim(),
        business_document: businessDoc.trim(),
      });
      setStep('submitted');
      loadMyClaims();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to submit claim';
      Alert.alert('Error', msg);
    }
    setSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return Colors.green;
    if (status === 'rejected') return '#E53E3E';
    return Colors.nutritionOrange;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Animated.View entering={FadeIn.duration(300)} style={s.header}>
        <TouchableOpacity onPress={() => step === 'claim' ? setStep('search') : router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerBrand}>
          <Image source={boLogoColor} style={s.headerLogo} contentFit="contain" transition={200} />
          <Text style={s.headerTitle}>{step === 'submitted' ? 'Claim Submitted' : step === 'claim' ? 'Verify Ownership' : 'Claim Restaurant'}</Text>
        </View>
        <View style={{ width: 24 }} />
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {step === 'submitted' && (
            <Animated.View entering={FadeInDown.duration(400)} style={s.successWrap}>
              <View style={s.successCircle}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.green} />
              </View>
              <Text style={s.successTitle}>Claim Submitted!</Text>
              <Text style={s.successSub}>
                Your claim for <Text style={{ fontWeight: '700' }}>{selected?.name}</Text> has been submitted for review. Our team will verify your ownership within 2-3 business days.
              </Text>
              <TouchableOpacity onPress={() => { setStep('search'); setSelected(null); setSearch(''); }} style={s.successBtn}>
                <Text style={s.successBtnText}>Claim Another</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === 'search' && (
            <>
              {/* Info Banner */}
              <Animated.View entering={FadeInDown.duration(400)} style={s.infoBanner}>
                <Ionicons name="storefront" size={24} color={Colors.green} />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoTitle}>Own a Restaurant?</Text>
                  <Text style={s.infoSub}>Claim your listing to manage your profile, respond to reviews, and get the BO Verified badge.</Text>
                </View>
              </Animated.View>

              {/* Search */}
              <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.searchWrap}>
                <View style={s.searchRow}>
                  <Ionicons name="search" size={20} color={Colors.textTertiary} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search your restaurant name..."
                    placeholderTextColor={Colors.textTertiary}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={searchRestaurants}
                    returnKeyType="search"
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearch(''); setRestaurants([]); }}>
                      <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={searchRestaurants} style={s.searchBtn} disabled={search.trim().length < 2}>
                  <Text style={s.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Results */}
              {loading && <ActivityIndicator size="large" color={Colors.green} style={{ marginTop: 40 }} />}

              {!loading && restaurants.length > 0 && (
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                  <Text style={s.resultCount}>{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found</Text>
                  {restaurants.map((r, i) => (
                    <Animated.View key={r.id} entering={FadeInDown.delay(i * 50).duration(300)}>
                      <TouchableOpacity style={[s.restCard, Shadow.sm]} onPress={() => selectRestaurant(r)} activeOpacity={0.8}>
                        <View style={[s.restIcon, { backgroundColor: r.bo_verified ? Colors.green + '15' : '#F5F5F5' }]}>
                          <Ionicons name="restaurant" size={24} color={r.bo_verified ? Colors.green : Colors.textTertiary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={s.restName}>{r.name}</Text>
                            {r.bo_verified && (
                              <View style={s.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={12} color="#FFF" />
                                <Text style={s.verifiedText}>Verified</Text>
                              </View>
                            )}
                          </View>
                          <Text style={s.restCuisine}>{r.cuisine} · {r.address}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </Animated.View>
              )}

              {!loading && search.length >= 2 && restaurants.length === 0 && (
                <View style={s.emptyState}>
                  <Ionicons name="search-outline" size={40} color={Colors.textTertiary} />
                  <Text style={s.emptyTitle}>No restaurants found</Text>
                  <Text style={s.emptySub}>Try a different search or contact us to add your restaurant.</Text>
                </View>
              )}

              {/* My Claims */}
              {myClaims.length > 0 && (
                <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                  <Text style={s.sectionTitle}>MY CLAIMS</Text>
                  {myClaims.map((c, i) => (
                    <View key={c.id || i} style={[s.claimCard, Shadow.sm]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.claimName}>{c.restaurant_name || 'Restaurant'}</Text>
                        <Text style={s.claimDate}>Submitted: {new Date(c.created_at).toLocaleDateString()}</Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: getStatusColor(c.status) + '15' }]}>
                        <Text style={[s.statusText, { color: getStatusColor(c.status) }]}>
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </Animated.View>
              )}
            </>
          )}

          {step === 'claim' && selected && (
            <Animated.View entering={FadeInDown.duration(400)}>
              {/* Selected restaurant card */}
              <View style={[s.selectedCard, Shadow.sm]}>
                <View style={s.selectedIcon}>
                  <Ionicons name="restaurant" size={28} color={Colors.green} />
                </View>
                <Text style={s.selectedName}>{selected.name}</Text>
                <Text style={s.selectedCuisine}>{selected.cuisine} · {selected.address}</Text>
              </View>

              {/* Ownership form */}
              <View style={s.formSection}>
                <Text style={s.formTitle}>Verify Your Ownership</Text>
                <Text style={s.formSub}>Please provide your contact details. We'll verify your identity before granting access.</Text>

                <Text style={s.label}>Full Name *</Text>
                <TextInput style={s.input} value={ownerName} onChangeText={setOwnerName} placeholder="John Smith" placeholderTextColor={Colors.textTertiary} />

                <Text style={s.label}>Business Email *</Text>
                <TextInput style={s.input} value={ownerEmail} onChangeText={setOwnerEmail} placeholder="owner@restaurant.com" placeholderTextColor={Colors.textTertiary} keyboardType="email-address" autoCapitalize="none" />

                <Text style={s.label}>Phone Number *</Text>
                <TextInput style={s.input} value={ownerPhone} onChangeText={setOwnerPhone} placeholder="+1 (555) 123-4567" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" />

                <Text style={s.label}>Business License / Registration # (Optional)</Text>
                <TextInput style={s.input} value={businessDoc} onChangeText={setBusinessDoc} placeholder="License number or document ref" placeholderTextColor={Colors.textTertiary} />

                <TouchableOpacity onPress={submitClaim} style={[s.submitBtn, submitting && { opacity: 0.6 }]} disabled={submitting} activeOpacity={0.8}>
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={s.submitBtnText}>Submit Claim</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.sm, gap: Spacing.sm },
  headerLogo: { width: 28, height: 28 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  infoBanner: { flexDirection: 'row', gap: Spacing.md, margin: Spacing.lg, padding: Spacing.md, backgroundColor: Colors.greenLight, borderRadius: Radius.lg, alignItems: 'flex-start' },
  infoTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.green },
  infoSub: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20, marginTop: 4 },
  searchWrap: { marginHorizontal: Spacing.lg, gap: Spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.borderLight },
  searchInput: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary },
  searchBtn: { backgroundColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  searchBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
  resultCount: { fontSize: FontSize.caption, color: Colors.textTertiary, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm, fontWeight: '600' },
  restCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  restIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  restName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  restCuisine: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.green, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: FontSize.small, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: 40 },
  sectionTitle: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1, marginHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  claimCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  claimName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  claimDate: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: FontSize.caption, fontWeight: '700' },
  selectedCard: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.xl, padding: Spacing.xl, margin: Spacing.lg, gap: Spacing.sm },
  selectedIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  selectedName: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  selectedCuisine: { fontSize: FontSize.small, color: Colors.textTertiary },
  formSection: { marginHorizontal: Spacing.lg, gap: Spacing.sm },
  formTitle: { fontSize: FontSize.h3, fontWeight: '700', color: Colors.textPrimary },
  formSub: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  label: { fontSize: FontSize.caption, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.sm },
  input: { backgroundColor: '#FFF', borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 14, fontSize: FontSize.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight },
  submitBtn: { backgroundColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg },
  submitBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
  successWrap: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 24, fontWeight: '800', color: Colors.green },
  successSub: { fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  successBtn: { backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 32, marginTop: Spacing.md },
  successBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
});
