import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

const NOTIF_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  meal_reminder: { icon: 'restaurant-outline', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
  water_reminder: { icon: 'water-outline', color: Colors.waterBlue, bg: Colors.waterSurface },
  workout_reminder: { icon: 'barbell-outline', color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
  sleep_reminder: { icon: 'moon-outline', color: '#5C6BC0', bg: '#E8EAF6' },
  badge_earned: { icon: 'trophy-outline', color: Colors.green, bg: Colors.greenLight },
  subscription: { icon: 'diamond-outline', color: '#FF9800', bg: '#FFF3E0' },
  admin_broadcast: { icon: 'megaphone-outline', color: '#E91E63', bg: '#FCE4EC' },
  community: { icon: 'people-outline', color: Colors.socialTeal, bg: Colors.socialSurface },
};

function timeAgo(dt: string) {
  try {
    const d = new Date(dt);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  } catch { return ''; }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(useCallback(() => { loadNotifs(1, true); }, []));

  const loadNotifs = async (p = 1, reset = false) => {
    if (reset) setLoading(true);
    try {
      const { data } = await api.get(`/v1/notifications?page=${p}&limit=20`);
      const items = data.data || [];
      if (reset) setNotifs(items); else setNotifs(prev => [...prev, ...items]);
      setUnread(data.unreadCount || 0);
      setHasMore(data.pagination?.hasNext || false);
      setPage(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const markRead = async (id: string) => {
    try {
      await api.put(`/v1/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/v1/notifications/read-all');
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (e) { console.error(e); }
  };

  const deleteNotif = async (id: string) => {
    try {
      await api.delete(`/v1/notifications/${id}`);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleTap = (item: any) => {
    if (!item.is_read) markRead(item.id);
  };

  const renderNotif = ({ item, index }: { item: any; index: number }) => {
    const cfg = NOTIF_ICONS[item.type] || NOTIF_ICONS.admin_broadcast;
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)}>
        <TouchableOpacity
          style={[ns.notifCard, !item.is_read && ns.notifUnread, Shadow.sm]}
          onPress={() => handleTap(item)}
          onLongPress={() => Alert.alert('Delete?', 'Remove this notification?', [
            { text: 'Cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteNotif(item.id) },
          ])}
          activeOpacity={0.8}
        >
          <View style={[ns.notifIcon, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={ns.notifHeaderRow}>
              <Text style={ns.notifTitle} numberOfLines={1}>{item.title}</Text>
              {!item.is_read && <View style={ns.unreadDot} />}
            </View>
            <Text style={ns.notifBody} numberOfLines={2}>{item.body}</Text>
            <Text style={ns.notifTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={ns.safe} edges={['top']}>
      <Animated.View entering={FadeIn.duration(300)} style={ns.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={ns.headerTitle}>Notifications</Text>
          {unread > 0 && <Text style={ns.headerSub}>{unread} unread</Text>}
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} style={ns.markAllBtn}>
            <Text style={ns.markAllText}>Read All</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {loading ? (
        <View style={ns.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={item => item.id}
          renderItem={renderNotif}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100, gap: Spacing.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadNotifs(1, true); setRefreshing(false); }} tintColor={Colors.green} />}
          onEndReached={() => hasMore && loadNotifs(page + 1)}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(400)} style={ns.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={56} color={Colors.textTertiary} />
              <Text style={ns.emptyTitle}>All caught up!</Text>
              <Text style={ns.emptySub}>You'll see reminders and updates here</Text>
            </Animated.View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const ns = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 1 },
  markAllBtn: { backgroundColor: Colors.greenLight, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  markAllText: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.green },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notifCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md },
  notifUnread: { backgroundColor: '#F0FFF0', borderLeftWidth: 3, borderLeftColor: Colors.green },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  notifBody: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 2, lineHeight: 20 },
  notifTime: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 4 },
  emptyWrap: { alignItems: 'center', paddingTop: 120, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.h3, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: FontSize.body, color: Colors.textTertiary },
});
