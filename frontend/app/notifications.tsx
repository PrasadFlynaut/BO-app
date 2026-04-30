import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, Alert, SectionList,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, FadeInRight } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import EmptyState from '@/src/components/EmptyState';
import { boLogoColor } from '@/src/assets';
import api from '@/src/api';
import { resolveDeepLink } from '@/src/notifications';

const NOTIF_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  meal_reminder:   { icon: 'restaurant',       color: Colors.nutritionOrange, bg: Colors.nutritionSurface, label: 'Meal'      },
  water_reminder:  { icon: 'water',             color: Colors.waterBlue,       bg: Colors.waterSurface,    label: 'Water'     },
  workout_reminder:{ icon: 'barbell',           color: Colors.fitnessPurple,   bg: Colors.fitnessSurface,  label: 'Workout'   },
  sleep_reminder:  { icon: 'moon',              color: '#5C6BC0',              bg: '#E8EAF6',              label: 'Sleep'     },
  badge_earned:    { icon: 'trophy',            color: Colors.green,           bg: Colors.greenLight,      label: 'Badge'     },
  subscription:    { icon: 'diamond',           color: '#FF9800',              bg: '#FFF3E0',              label: 'Plan'      },
  admin_broadcast: { icon: 'megaphone',         color: '#E91E63',              bg: '#FCE4EC',              label: 'Announce'  },
  community:       { icon: 'people',            color: Colors.socialTeal,      bg: Colors.socialSurface,   label: 'Community' },
};
const DEFAULT_CFG = NOTIF_CONFIG.admin_broadcast;

function timeAgo(dt: string) {
  try {
    const d = new Date(dt);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function sectionLabel(dt: string) {
  try {
    const d = new Date(dt);
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();
    if (d.toDateString() === todayStr) return 'Today';
    if (d.toDateString() === yesterdayStr) return 'Yesterday';
    const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (daysAgo < 7) return 'This Week';
    if (daysAgo < 30) return 'This Month';
    return 'Older';
  } catch { return 'Older'; }
}

function groupByDate(items: any[]) {
  const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
  const map: Record<string, any[]> = {};
  for (const item of items) {
    const label = sectionLabel(item.created_at);
    if (!map[label]) map[label] = [];
    map[label].push(item);
  }
  return order.filter(k => map[k]).map(k => ({ title: k, data: map[k] }));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useFocusEffect(useCallback(() => { load(1, true); }, []));

  const load = async (p = 1, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (filter === 'unread') params.set('unreadOnly', 'true');
      const { data } = await api.get(`/v1/notifications?${params}`);
      const items = data.data || [];
      if (reset) setNotifs(items); else setNotifs(prev => [...prev, ...items]);
      setUnread(data.unreadCount || 0);
      setHasMore(data.pagination?.hasNext || false);
      setPage(p);
    } catch (e) { console.error(e); }
    setLoading(false);
    setLoadingMore(false);
  };

  const markRead = async (id: string) => {
    try {
      await api.put(`/v1/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/v1/notifications/read-all');
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  };

  const deleteNotif = async (id: string) => {
    try {
      await api.delete(`/v1/notifications/${id}`);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const confirmDelete = (id: string) =>
    Alert.alert('Delete Notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNotif(id) },
    ]);

  const switchFilter = (f: 'all' | 'unread') => {
    setFilter(f);
    setNotifs([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    const params = new URLSearchParams({ page: '1', limit: '20' });
    if (f === 'unread') params.set('unreadOnly', 'true');
    api.get(`/v1/notifications?${params}`)
      .then(({ data }) => {
        setNotifs(data.data || []);
        setUnread(data.unreadCount || 0);
        setHasMore(data.pagination?.hasNext || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const displayed = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs;
  const sections = groupByDate(displayed);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const cfg = NOTIF_CONFIG[item.type] || DEFAULT_CFG;
    const isUnread = !item.is_read;
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 35).duration(320)}>
        <TouchableOpacity
          style={[ns.card, isUnread && ns.cardUnread]}
          onPress={() => {
            if (isUnread) markRead(item.id);
            const link = item.deep_link || item.deepLink;
            if (link) {
              const resolved = resolveDeepLink(link);
              if (resolved) router.push(resolved as any);
            }
          }}
          onLongPress={() => confirmDelete(item.id)}
          activeOpacity={0.82}
        >
          {/* Unread accent bar */}
          {isUnread && <View style={[ns.accentBar, { backgroundColor: cfg.color }]} />}

          {/* Icon */}
          <View style={[ns.iconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
          </View>

          {/* Content */}
          <View style={ns.cardContent}>
            <View style={ns.cardTopRow}>
              <View style={[ns.typePill, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                <Text style={[ns.typeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <Text style={ns.timeText}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={[ns.cardTitle, isUnread && ns.cardTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={ns.cardBody} numberOfLines={2}>{item.body}</Text>
          </View>

          {/* Actions */}
          <View style={ns.cardActions}>
            {isUnread && <View style={[ns.unreadDot, { backgroundColor: cfg.color }]} />}
            {(item.deep_link || item.deepLink) && (
              <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
            )}
            <TouchableOpacity
              onPress={() => confirmDelete(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={ns.deleteBtn}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <Animated.View entering={FadeInRight.duration(300)} style={ns.sectionHeader}>
      <View style={ns.sectionLine} />
      <Text style={ns.sectionLabel}>{section.title}</Text>
      <View style={ns.sectionLine} />
    </Animated.View>
  );

  return (
    <SafeAreaView style={ns.safe} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)}>
        <LinearGradient colors={['#FFFFFF', '#F7FDF8']} style={ns.header}>
          <TouchableOpacity onPress={() => router.back()} style={ns.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={ns.headerCenter}>
            <Text style={ns.headerTitle}>Notifications</Text>
            {unread > 0 && (
              <View style={ns.unreadBadge}>
                <Text style={ns.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>

          {unread > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={ns.readAllBtn}>
              <Ionicons name="checkmark-done" size={14} color={Colors.green} />
              <Text style={ns.readAllText}>All read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 72 }} />
          )}
        </LinearGradient>

        {/* Filter tabs */}
        <View style={ns.filterRow}>
          {(['all', 'unread'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[ns.filterTab, filter === f && ns.filterTabActive]}
              onPress={() => switchFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[ns.filterTabText, filter === f && ns.filterTabTextActive]}>
                {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {loading ? (
        <View style={ns.loadWrap}>
          <ActivityIndicator size="large" color={Colors.green} />
          <Text style={ns.loadText}>Loading notifications…</Text>
        </View>
      ) : sections.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title={filter === 'unread' ? 'No unread notifications' : 'All caught up!'}
          subtitle={filter === 'unread' ? 'Switch to All to see your full history.' : "You'll see reminders, badges, and updates here."}
          action={filter === 'unread' ? { label: 'View All', onPress: () => switchFilter('all') } : undefined}
          variant="green"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={ns.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await load(1, true); setRefreshing(false); }}
              tintColor={Colors.green}
            />
          }
          onEndReached={() => { if (hasMore && !loadingMore) load(page + 1); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={ns.loadMoreRow}>
                <ActivityIndicator size="small" color={Colors.green} />
                <Text style={ns.loadMoreText}>Loading more…</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const ns = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7F5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  unreadBadge: {
    backgroundColor: Colors.green, borderRadius: Radius.pill,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  readAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.greenLight, borderRadius: Radius.pill,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  readAllText: { fontSize: 12, fontWeight: '700', color: Colors.green },

  // Filters
  filterRow: {
    flexDirection: 'row', backgroundColor: '#FFF',
    paddingHorizontal: Spacing.lg, paddingBottom: 12, paddingTop: 4,
    gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  filterTab: {
    paddingVertical: 7, paddingHorizontal: 18,
    borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.borderLight,
    backgroundColor: '#F9FAFB',
  },
  filterTabActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  filterTabText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  filterTabTextActive: { color: Colors.green },

  // List
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 100, paddingTop: Spacing.sm },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  sectionLabel: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF', borderRadius: Radius.lg,
    marginBottom: Spacing.sm, overflow: 'hidden',
    ...Shadow.sm,
  },
  cardUnread: { backgroundColor: '#FAFFFE' },
  accentBar: { width: 3, alignSelf: 'stretch', borderTopLeftRadius: Radius.lg, borderBottomLeftRadius: Radius.lg },

  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    margin: 14, marginRight: 0, flexShrink: 0,
  },

  cardContent: { flex: 1, paddingVertical: 12, paddingLeft: 12, paddingRight: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },

  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.pill, paddingVertical: 2, paddingHorizontal: 7,
  },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  timeText: { fontSize: 11, color: Colors.textTertiary, fontWeight: '500' },

  cardTitle: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary, marginBottom: 3 },
  cardTitleUnread: { fontWeight: '700', color: Colors.textPrimary },
  cardBody: { fontSize: FontSize.caption, color: Colors.textTertiary, lineHeight: 17 },

  cardActions: { paddingTop: 12, paddingRight: 12, alignItems: 'center', gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  deleteBtn: { padding: 4 },

  // Loading states
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadText: { fontSize: FontSize.small, color: Colors.textTertiary, fontWeight: '500' },
  loadMoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadMoreText: { fontSize: FontSize.caption, color: Colors.textTertiary },
});
