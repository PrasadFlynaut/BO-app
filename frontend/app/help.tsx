import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

type Faq = { id: string; question: string; answer: string; display_order: number };
type Category = { name: string; faqs: Faq[]; count: number };
type Ticket = { id: string; ticketNumber: string; subject: string; category: string; priority: string; status: string; lastMessage: string; updatedAt: string; unreadCount: number };

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#DBEAFE', text: '#1D4ED8' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#F3F4F6', text: '#6B7280' },
};

const CATS = ['Account', 'Billing', 'Technical', 'Feature Request', 'Bug Report', 'Other'];
const PRIOS = ['low', 'medium', 'high'];

export default function HelpScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'faqs' | 'tickets'>('faqs');

  // FAQ state
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [faqLoading, setFaqLoading] = useState(true);

  // Ticket state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketFilter, setTicketFilter] = useState('all');
  const [ticketLoading, setTicketLoading] = useState(false);

  // Create ticket modal
  const [showCreate, setShowCreate] = useState(false);
  const [tSubject, setTSubject] = useState('');
  const [tCategory, setTCategory] = useState('Technical');
  const [tPriority, setTPriority] = useState('medium');
  const [tDesc, setTDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadFaqs(); }, []);

  useFocusEffect(useCallback(() => {
    if (tab === 'tickets') loadTickets();
  }, [tab, ticketFilter]));

  const loadFaqs = async () => {
    try {
      const { data } = await api.get('/v1/faqs');
      setCategories(data.categories || []);
    } catch (e) { console.error(e); }
    setFaqLoading(false);
  };

  const loadTickets = async () => {
    setTicketLoading(true);
    try {
      const { data } = await api.get(`/v1/tickets?status=${ticketFilter}&page=1&limit=50`);
      setTickets(data.data || []);
    } catch (e) { console.error(e); }
    setTicketLoading(false);
  };

  const createTicket = async () => {
    if (!tSubject.trim() || !tDesc.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/v1/ticket', { subject: tSubject.trim(), category: tCategory, priority: tPriority, description: tDesc.trim(), attachments: [] });
      setShowCreate(false);
      setTSubject(''); setTDesc(''); setTCategory('Technical'); setTPriority('medium');
      setTab('tickets');
      loadTickets();
      router.push(`/ticket-detail?id=${data.ticket.id}` as any);
    } catch (e: any) {
      console.error('Create ticket error:', e);
    }
    setCreating(false);
  };

  // Filter FAQs by search
  const filteredCats = search.trim()
    ? categories.map(c => ({ ...c, faqs: c.faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase())) })).filter(c => c.faqs.length > 0)
    : categories;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {(['faqs', 'tickets'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => { setTab(t); if (t === 'tickets') loadTickets(); }}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'faqs' ? 'FAQs' : 'My Tickets'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'faqs' ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Search */}
          <View style={s.searchWrap}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search FAQs..." placeholderTextColor="#9CA3AF" />
            {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#9CA3AF" /></TouchableOpacity> : null}
          </View>

          {faqLoading ? <ActivityIndicator size="large" color={Colors.green} style={{ marginTop: 40 }} /> : (
            <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}>
              {filteredCats.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Ionicons name="search" size={40} color="#D1D5DB" />
                  <Text style={s.emptyText}>No FAQs match your search. Try different keywords or contact support.</Text>
                </View>
              ) : filteredCats.map((cat, ci) => (
                <Animated.View key={ci} entering={FadeInDown.delay(ci * 60).duration(350)} style={{ marginBottom: Spacing.sm }}>
                  <TouchableOpacity style={s.catRow} onPress={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)} activeOpacity={0.7}>
                    <Text style={s.catName}>{cat.name}</Text>
                    <View style={s.catRight}>
                      <View style={s.countBadge}><Text style={s.countText}>{cat.faqs.length}</Text></View>
                      <Ionicons name={expandedCat === cat.name ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                  {expandedCat === cat.name && cat.faqs.map((faq, fi) => (
                    <View key={fi} style={s.faqItem}>
                      <TouchableOpacity onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}>
                        <Text style={s.faqQ}>{faq.question}</Text>
                      </TouchableOpacity>
                      {expandedFaq === faq.id && <Text style={s.faqA}>{faq.answer}</Text>}
                    </View>
                  ))}
                </Animated.View>
              ))}

              {/* CTA */}
              <View style={s.ctaCard}>
                <Text style={s.ctaText}>Still need help?</Text>
                <TouchableOpacity onPress={() => setShowCreate(true)}>
                  <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.ctaBtn}>
                    <Text style={s.ctaBtnText}>Create a Support Ticket</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 8 }}>
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
              <TouchableOpacity key={f} style={[s.filterChip, ticketFilter === f && s.filterChipActive]} onPress={() => setTicketFilter(f)}>
                <Text style={[s.filterText, ticketFilter === f && s.filterTextActive]}>{f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {ticketLoading ? <ActivityIndicator size="large" color={Colors.green} style={{ marginTop: 40 }} /> : tickets.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="ticket-outline" size={40} color="#D1D5DB" />
              <Text style={s.emptyText}>No support tickets. Create one if you need help!</Text>
              <TouchableOpacity onPress={() => setShowCreate(true)}>
                <LinearGradient colors={[Colors.green, Colors.greenDark]} style={[s.ctaBtn, { marginTop: Spacing.md }]}>
                  <Text style={s.ctaBtnText}>Create Ticket</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={tickets}
              keyExtractor={t => t.id}
              contentContainerStyle={{ padding: Spacing.md }}
              renderItem={({ item }) => {
                const sc = STATUS_COLORS[item.status] || STATUS_COLORS.open;
                return (
                  <TouchableOpacity style={[s.ticketCard, Shadow.sm]} onPress={() => router.push(`/ticket-detail?id=${item.id}` as any)} activeOpacity={0.7}>
                    <View style={s.ticketTop}>
                      <Text style={s.ticketNum}>{item.ticketNumber}</Text>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}><Text style={[s.statusText, { color: sc.text }]}>{item.status === 'in_progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text></View>
                    </View>
                    <Text style={s.ticketSubject} numberOfLines={1}>{item.subject}</Text>
                    {item.lastMessage ? <Text style={s.ticketPreview} numberOfLines={1}>{item.lastMessage}</Text> : null}
                    <View style={s.ticketBottom}>
                      <Text style={s.ticketTime}>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</Text>
                      {item.unreadCount > 0 && <View style={s.unreadDot} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* FAB for new ticket */}
          <TouchableOpacity style={s.fab} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Create Ticket Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
              <Text style={s.modalTitle}>New Ticket</Text>
              <TouchableOpacity onPress={createTicket} disabled={creating || !tSubject.trim() || !tDesc.trim()} style={[s.submitBtn, (!tSubject.trim() || !tDesc.trim()) && { opacity: 0.4 }]}>
                <Text style={s.submitText}>{creating ? 'Creating...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
              <Text style={s.formLabel}>Subject</Text>
              <TextInput style={s.formInput} value={tSubject} onChangeText={setTSubject} placeholder="Brief description..." placeholderTextColor="#9CA3AF" maxLength={100} autoFocus />

              <Text style={s.formLabel}>Category</Text>
              <View style={s.chipRow}>
                {CATS.map(c => (
                  <TouchableOpacity key={c} style={[s.catChip, tCategory === c && s.catChipActive]} onPress={() => setTCategory(c)}>
                    <Text style={[s.catChipText, tCategory === c && s.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.formLabel}>Priority</Text>
              <View style={s.prioRow}>
                {PRIOS.map(p => (
                  <TouchableOpacity key={p} style={[s.prioChip, tPriority === p && s.prioChipActive]} onPress={() => setTPriority(p)}>
                    <Text style={[s.prioChipText, tPriority === p && s.prioChipTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.formLabel}>Description</Text>
              <TextInput style={s.formTextarea} value={tDesc} onChangeText={setTDesc} placeholder="Describe your issue in detail..." placeholderTextColor="#9CA3AF" multiline maxLength={2000} textAlignVertical="top" />
              <Text style={s.charCount}>{tDesc.length}/2000</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.green },
  tabText: { fontSize: FontSize.body, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: Colors.green },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', marginHorizontal: Spacing.md, marginVertical: Spacing.md, borderRadius: Radius.lg, paddingHorizontal: 14, gap: 8, height: 48 },
  searchInput: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: FontSize.small, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 16 },
  catName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: '#F3F4F6', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  countText: { fontSize: FontSize.caption, fontWeight: '600', color: '#6B7280' },
  faqItem: { backgroundColor: '#FAFAFA', marginLeft: 16, paddingHorizontal: 14, paddingVertical: 12, borderLeftWidth: 2, borderLeftColor: Colors.green + '40' },
  faqQ: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  faqA: { fontSize: 14, color: '#666666', marginTop: 6, lineHeight: 20 },
  ctaCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.md },
  ctaText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  ctaBtn: { borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 32 },
  ctaBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  filterRow: { paddingVertical: Spacing.sm },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.borderLight },
  filterChipActive: { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  filterText: { fontSize: FontSize.small, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: Colors.green },
  ticketCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketNum: { fontSize: FontSize.small, fontWeight: '800', color: Colors.textPrimary },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  ticketSubject: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textPrimary },
  ticketPreview: { fontSize: FontSize.small, color: '#666666', marginTop: 4 },
  ticketBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  ticketTime: { fontSize: FontSize.caption, color: '#9CA3AF' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.waterBlue },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalCancel: { fontSize: FontSize.body, color: Colors.textTertiary },
  modalTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  submitBtn: { backgroundColor: Colors.green, borderRadius: Radius.pill, paddingHorizontal: 20, paddingVertical: 8 },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.small },
  formLabel: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 14 },
  formInput: { backgroundColor: '#F7F8FA', borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 16, fontSize: FontSize.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.borderLight },
  catChipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  catChipText: { fontSize: FontSize.small, fontWeight: '600', color: '#6B7280' },
  catChipTextActive: { color: Colors.green },
  prioRow: { flexDirection: 'row', gap: 8 },
  prioChip: { flex: 1, paddingVertical: 10, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center' },
  prioChipActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight },
  prioChipText: { fontSize: FontSize.small, fontWeight: '600', color: '#6B7280' },
  prioChipTextActive: { color: Colors.green },
  formTextarea: { backgroundColor: '#F7F8FA', borderRadius: Radius.lg, padding: 16, fontSize: FontSize.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight, minHeight: 120 },
  charCount: { fontSize: FontSize.caption, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
});
