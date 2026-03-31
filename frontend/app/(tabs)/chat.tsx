import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import api from '@/src/api';

export default function ChatScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => { loadHistory(); }, []));
  const loadHistory = async () => { try { const { data } = await api.get('/chat/history'); setMessages(data.messages); } catch (e) { console.error(e); } };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim(); setInput(''); setSending(true);
    const temp = { id: `t-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, temp]);
    try {
      const { data } = await api.post('/chat', { message: text });
      setMessages(prev => [...prev.filter(m => m.id !== temp.id), data.user_message, data.ai_message]);
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  const SUGGESTIONS = ['Suggest a healthy breakfast', 'How much water should I drink?', 'Give me a quick workout', 'Help me plan meals for today'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="sparkles" size={20} color={Colors.green} /></View>
        <View><Text style={styles.headerTitle}>BO Wellness Coach</Text><Text style={styles.headerSub}>Powered by AI</Text></View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id} contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="sparkles" size={40} color={Colors.green} />
              <Text style={styles.welcomeTitle}>Hi! I'm your BO Coach</Text>
              <Text style={styles.welcomeSub}>Ask me anything about nutrition, fitness, or wellness</Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s, i) => (<TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => setInput(s)} activeOpacity={0.7}><Text style={styles.suggestionText}>{s}</Text></TouchableOpacity>))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {item.role === 'assistant' && <View style={styles.aiIcon}><Ionicons name="sparkles" size={14} color={Colors.green} /></View>}
              <Text style={[styles.bubbleText, item.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>{item.content}</Text>
            </View>
          )}
        />
        <View style={styles.inputRow}>
          <TextInput testID="chat-input" style={styles.chatInput} value={input} onChangeText={setInput} placeholder="Ask your wellness coach..." placeholderTextColor={Colors.textMuted} multiline maxLength={500} />
          <TouchableOpacity testID="chat-send-button" style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '700' },
  headerSub: { color: Colors.textMuted, fontSize: FontSize.small },
  chatList: { padding: Spacing.md, paddingBottom: Spacing.lg, flexGrow: 1 },
  bubble: { maxWidth: '82%', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  userBubble: { backgroundColor: Colors.green, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: Colors.bgSurface, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  aiIcon: { marginBottom: 4 },
  bubbleText: { fontSize: FontSize.body, lineHeight: 22 },
  userBubbleText: { color: '#FFFFFF' },
  aiBubbleText: { color: Colors.textPrimary },
  emptyChat: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.lg },
  welcomeTitle: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '700', marginTop: Spacing.md },
  welcomeSub: { color: Colors.textSecondary, fontSize: FontSize.body, textAlign: 'center', marginTop: Spacing.sm },
  suggestions: { marginTop: Spacing.xl, gap: Spacing.sm, width: '100%' },
  suggestionChip: { backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  suggestionText: { color: Colors.textSecondary, fontSize: FontSize.body },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bgBase },
  chatInput: { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { backgroundColor: Colors.green, borderRadius: Radius.md, padding: 14 },
  sendBtnDisabled: { opacity: 0.4 },
});
