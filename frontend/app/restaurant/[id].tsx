import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, Modal, Linking, Share,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rest, setRest] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewStars, setReviewStars] = useState(0);

  useEffect(() => { if (id) loadAll(); }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rRes, mRes, rvRes] = await Promise.all([
        api.get(`/restaurants/${id}`),
        api.get(`/restaurants/menu/${id}`),
        api.get(`/restaurants/reviews/${id}`),
      ]);
      setRest(rRes.data.restaurant);
      setMenu(mRes.data.menuItems || []);
      setReviews(rvRes.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggleFav = async () => {
    setLiked(!liked);
    try { const { data } = await api.post(`/restaurants/like/${id}`); setLiked(data.liked); } catch (e) { setLiked(liked); }
  };

  const submitRating = async () => {
    if (selectedStars < 1) return;
    try {
      await api.post('/restaurants/rating', { restaurant_id: id, rating: selectedStars });
      setShowRating(false);
      loadAll();
    } catch (e) { console.error(e); }
  };

  const submitReview = async () => {
    if (reviewStars < 1 || !reviewText.trim()) return;
    try {
      await api.post('/restaurants/reviews', { restaurant_id: id, rating: reviewStars, text: reviewText });
      setShowReview(false); setReviewText(''); setReviewStars(0);
      loadAll();
    } catch (e) { console.error(e); }
  };

  if (loading || !rest) {
    return <SafeAreaView style={st.safe}><View style={st.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View></SafeAreaView>;
  }

  const isOpen = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const cur = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return cur >= (rest.open_time || '00:00') && cur <= (rest.close_time || '23:59');
  };

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={st.heroWrap}>
          <Image source={{ uri: rest.image_url }} style={st.heroImg} />
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.5)']} style={st.heroGrad} />
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={st.info}>
          <Text style={st.name}>{rest.name}</Text>

          {/* Badges */}
          <View style={st.badgeRow}>
            {rest.bo_verified && (
              <View style={[st.badge, { backgroundColor: Colors.greenLight }]}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.green} />
                <Text style={[st.badgeText, { color: Colors.green }]}>BO Verified</Text>
              </View>
            )}
            {rest.bo_partner && (
              <View style={[st.badge, { backgroundColor: Colors.nutritionSurface }]}>
                <Ionicons name="handshake-outline" size={14} color={Colors.nutritionOrange} />
                <Text style={[st.badgeText, { color: Colors.nutritionOrange }]}>BO Partner</Text>
              </View>
            )}
          </View>

          {/* Cuisines */}
          <View style={st.cuisineRow}>
            {(rest.cuisines || []).map((c: string, i: number) => (
              <View key={i} style={st.cuisinePill}><Text style={st.cuisineText}>{c}</Text></View>
            ))}
          </View>

          {/* Rating */}
          <View style={st.ratingRow}>
            {[1,2,3,4,5].map(s => (
              <Ionicons key={s} name={s <= Math.round(rest.average_rating || 0) ? 'star' : 'star-outline'} size={18} color="#FFD700" />
            ))}
            <Text style={st.ratingNum}>{rest.average_rating || '0.0'}</Text>
            <Text style={st.ratingCount}>({rest.total_ratings || 0} ratings)</Text>
          </View>

          {/* Detail Rows */}
          <View style={st.detailRow}>
            <Ionicons name="location-outline" size={20} color={Colors.textSecondary} />
            <Text style={st.detailText}>{rest.address}</Text>
          </View>
          <View style={st.detailRow}>
            <View style={[st.statusDot, { backgroundColor: isOpen() ? Colors.green : '#E53E3E' }]} />
            <Text style={st.detailText}>{isOpen() ? 'Open Now' : 'Closed'} - {rest.open_time} to {rest.close_time}</Text>
          </View>
          {rest.phone && (
            <TouchableOpacity style={st.detailRow} onPress={() => Linking.openURL(`tel:${rest.phone}`)}>
              <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
              <Text style={[st.detailText, { color: Colors.green }]}>{rest.phone}</Text>
            </TouchableOpacity>
          )}
          {rest.description && <Text style={st.description}>{rest.description}</Text>}

          {/* Action Buttons */}
          <View style={st.actionRow}>
            <TouchableOpacity style={st.actionBtn} onPress={toggleFav}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#E53E3E' : Colors.textSecondary} />
              <Text style={st.actionLabel}>{liked ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.actionBtn} onPress={() => setShowRating(true)}>
              <Ionicons name="star-outline" size={22} color={Colors.textSecondary} />
              <Text style={st.actionLabel}>Rate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.actionBtn} onPress={async () => {
              try {
                await Share.share({ message: `Check out ${rest?.name} on BO Wellness!\n\n${rest?.description || ''}\n\nShared via BO Wellness App`, title: rest?.name || 'Restaurant' });
              } catch (e) { console.error(e); }
            }}>
              <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
              <Text style={st.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Section */}
        {menu.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Menu ({menu.length} items)</Text>
            {menu.map((m, i) => (
              <View key={m.id || i} style={[st.menuItem, Shadow.sm]}>
                <Image source={{ uri: m.image_url }} style={st.menuImg} />
                <View style={{ flex: 1 }}>
                  <Text style={st.menuName}>{m.title}</Text>
                  <Text style={st.menuDesc} numberOfLines={2}>{m.about || m.description}</Text>
                  <View style={st.menuBadges}>
                    {m.category && <View style={st.menuBadge}><Text style={st.menuBadgeText}>{m.category}</Text></View>}
                    {m.menu_type && <View style={st.menuBadge}><Text style={st.menuBadgeText}>{m.menu_type}</Text></View>}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Reviews Section */}
        <View style={st.section}>
          <View style={st.reviewHeader}>
            <Text style={st.sectionTitle}>Reviews ({reviews.length})</Text>
            <TouchableOpacity onPress={() => setShowReview(true)}><Text style={st.writeReview}>Write a Review</Text></TouchableOpacity>
          </View>
          {reviews.length === 0 ? (
            <View style={st.emptyReview}>
              <Ionicons name="chatbubble-outline" size={32} color={Colors.textTertiary} />
              <Text style={st.emptyText}>Be the first to review!</Text>
            </View>
          ) : reviews.map((rv, i) => (
            <View key={rv.id || i} style={st.reviewCard}>
              <View style={st.reviewTop}>
                <View style={st.reviewAvatar}><Text style={st.avatarText}>{(rv.user_name || 'A')[0].toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.reviewName}>{rv.user_name}</Text>
                  <View style={st.reviewStarsRow}>
                    {[1,2,3,4,5].map(s => <Ionicons key={s} name={s <= rv.rating ? 'star' : 'star-outline'} size={12} color="#FFD700" />)}
                  </View>
                </View>
                <Text style={st.reviewDate}>{rv.created_at ? new Date(rv.created_at).toLocaleDateString() : ''}</Text>
              </View>
              <Text style={st.reviewBody}>{rv.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={showRating} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, Shadow.lg]}>
            <View style={st.modalHandle} />
            <Text style={st.modalTitle}>Rate this Restaurant</Text>
            <View style={st.starSelector}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setSelectedStars(s)}>
                  <Ionicons name={s <= selectedStars ? 'star' : 'star-outline'} size={40} color="#FFD700" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={submitRating} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.submitBtn}>
                <Text style={st.submitText}>Submit Rating</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRating(false)}><Text style={st.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={showReview} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, Shadow.lg]}>
            <View style={st.modalHandle} />
            <Text style={st.modalTitle}>Write a Review</Text>
            <View style={st.starSelector}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setReviewStars(s)}>
                  <Ionicons name={s <= reviewStars ? 'star' : 'star-outline'} size={32} color="#FFD700" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.reviewInput} value={reviewText} onChangeText={setReviewText} placeholder="Share your experience..." placeholderTextColor={Colors.textTertiary} multiline maxLength={500} textAlignVertical="top" />
            <Text style={st.charCount}>{reviewText.length}/500</Text>
            <TouchableOpacity onPress={submitReview} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.submitBtn}>
                <Text style={st.submitText}>Submit Review</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowReview(false)}><Text style={st.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 100 },
  heroWrap: { position: 'relative' },
  heroImg: { width: '100%', height: 250 },
  heroGrad: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backBtn: { position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  info: { padding: Spacing.lg },
  name: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill },
  badgeText: { fontSize: 12, fontWeight: '700' },
  cuisineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md },
  cuisinePill: { borderWidth: 1.5, borderColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 12 },
  cuisineText: { fontSize: FontSize.caption, color: Colors.green, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.md },
  ratingNum: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginLeft: 4 },
  ratingCount: { fontSize: FontSize.small, color: Colors.textTertiary },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.md },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  detailText: { fontSize: FontSize.small, color: Colors.textSecondary, flex: 1 },
  description: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 22, marginTop: Spacing.md },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: FontSize.caption, color: Colors.textSecondary, fontWeight: '600' },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  menuItem: { flexDirection: 'row', gap: Spacing.md, padding: 12, borderRadius: Radius.lg, backgroundColor: '#FFF', marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
  menuImg: { width: 80, height: 80, borderRadius: Radius.md },
  menuName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  menuDesc: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  menuBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  menuBadge: { backgroundColor: Colors.greenLight, borderRadius: Radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  menuBadgeText: { fontSize: 10, color: Colors.green, fontWeight: '600', textTransform: 'capitalize' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  writeReview: { fontSize: FontSize.small, color: Colors.green, fontWeight: '700' },
  emptyReview: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  emptyText: { fontSize: FontSize.body, color: Colors.textTertiary },
  reviewCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.green },
  reviewName: { fontSize: FontSize.small, fontWeight: '700', color: Colors.textPrimary },
  reviewStarsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reviewDate: { fontSize: FontSize.caption, color: Colors.textTertiary },
  reviewBody: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.bgBase, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.lg },
  starSelector: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: Spacing.lg },
  reviewInput: { backgroundColor: Colors.greenLight, borderRadius: Radius.lg, padding: Spacing.md, minHeight: 100, fontSize: FontSize.body, color: Colors.textPrimary, outlineStyle: 'none' as any, marginBottom: 4 },
  charCount: { fontSize: FontSize.caption, color: Colors.textTertiary, textAlign: 'right', marginBottom: Spacing.md },
  submitBtn: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
  cancelText: { color: Colors.textTertiary, fontSize: FontSize.body, textAlign: 'center', marginTop: Spacing.md, fontWeight: '600' },
});
