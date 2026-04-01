import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

type Message = { id: string; senderId: string; senderType: string; text: string; attachments: string[]; createdAt: string };
type TicketInfo = { id: string; ticketNumber: string; subject: string; category: string; priority: string; status: string; createdAt: string };

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#DBEAFE', text: '#1D4ED8' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTicket();
    // Poll every 30s
    pollRef.current = setInterval(loadMessages, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadTicket = async () => {
    try {
      const { data } = await api.get(`/v1/tickets/${id}`);
      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/v1/tickets/allmessages?ticketId=${id}`);
      setMessages(data.data || []);
    } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!msgText.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post('/v1/ticket/message', { ticketId: id, text: msgText.trim(), attachments: [] });
      setMessages(prev => [...prev, data.message]);
      setMsgText('');
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const reopenTicket = async () => {
    try {
      await api.put(`/v1/tickets/${id}`, { status: 'open' });
      loadTicket();
    } catch (e) { console.error(e); }
  };

  if (loading) return <SafeAreaView style={s.safe}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={Colors.green} /></View></SafeAreaView>;
  if (!ticket) return <SafeAreaView style={s.safe}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Ticket not found</Text></View></SafeAreaView>;

  const sc = STATUS_COLORS[ticket.status] || STATUS_COLORS.open;
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={s.ticketNum}>{ticket.ticketNumber}</Text>
          <Text style={s.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[s.statusText, { color: sc.text }]}>{ticket.status === 'in_progress' ? 'In Progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.lg }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          if (item.senderType === 'system') {
            return <Text style={s.systemMsg}>{item.text}</Text>;
          }
          const isUser = item.senderType === 'user';
          return (
            <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAdmin]}>
              <Text style={[s.bubbleSender, isUser ? { textAlign: 'right' } : {}]}>{isUser ? 'You' : 'Support'}</Text>
              <Text style={s.bubbleText}>{item.text}</Text>
              <Text style={[s.bubbleTime, isUser ? { textAlign: 'right' } : {}]}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
            </View>
          );
        }}
      />

      {/* Reopen button for resolved/closed */}
      {isClosed && (
        <View style={s.reopenWrap}>
          <TouchableOpacity style={s.reopenBtn} onPress={reopenTicket}>
            <Ionicons name="refresh-outline" size={18} color={Colors.green} />
            <Text style={s.reopenText}>Reopen Ticket</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      {!isClosed && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.inputBar}>
            <TextInput
              style={s.msgInput}
              value={msgText}
              onChangeText={setMsgText}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={2000}
            />
            <TouchableOpacity style={[s.sendBtn, (!msgText.trim() || sending) && { opacity: 0.4 }]} onPress={sendMessage} disabled={!msgText.trim() || sending}>
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ticketNum: { fontSize: FontSize.caption, fontWeight: '800', color: Colors.green },
  ticketSubject: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textPrimary },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  systemMsg: { textAlign: 'center', fontSize: FontSize.caption, color: '#9CA3AF', paddingVertical: 8 },
  bubble: { maxWidth: '75%', borderRadius: Radius.lg, padding: 12, marginBottom: 10 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#E8F5E9', borderBottomRightRadius: 4 },
  bubbleAdmin: { alignSelf: 'flex-start', backgroundColor: '#F5F5F5', borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 4 },
  bubbleText: { fontSize: FontSize.body, color: Colors.textPrimary, lineHeight: 22 },
  bubbleTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  reopenWrap: { padding: Spacing.md, alignItems: 'center', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: Colors.borderLight },
  reopenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 24, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.green },
  reopenText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.green },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: 10 },
  msgInput: { flex: 1, backgroundColor: '#F7F8FA', borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 10, fontSize: FontSize.body, color: Colors.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: Colors.borderLight },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
});
