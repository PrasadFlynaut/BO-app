import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
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

  const SUGGESTIONS = [
    { text: 'Suggest a healthy breakfast', icon: 'sunny-outline', color: Colors.nutritionOrange },
    { text: 'How much water today?', icon: 'water-outline', color: Colors.waterBlue },
    { text: 'Quick 15-min workout', icon: 'barbell-outline', color: Colors.fitnessPurple },
    { text: 'Plan meals for today', icon: 'restaurant-outline', color: Colors.green },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, Shadow.sm]}>
        <LinearGradient colors={[Colors.greenLight, '#FFFFFF']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconWrap}><Ionicons name="sparkles" size={22} color={Colors.green} /></View>
            <View><Text style={styles.headerTitle}>BO Wellness Coach</Text><Text style={styles.headerSub}>AI-Powered Nutrition & Fitness</Text></View>
          </View>
          <View style={styles.statusDot}><View style={styles.statusDotInner} /><Text style={styles.statusText}>Online</Text></View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id} contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown.duration(600)} style={styles.emptyChat}>
              <View style={styles.welcomeIconWrap}><Ionicons name="sparkles" size={36} color={Colors.green} /></View>
              <Text style={styles.welcomeTitle}>Hi! I'm your BO Coach</Text>
              <Text style={styles.welcomeSub}>Ask me anything about nutrition, fitness, or wellness. I'm personalized to your goals.</Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s, i) => (
                  <Animated.View key={i} entering={FadeInDown.delay(200 + i * 100).duration(400)}>
                    <TouchableOpacity style={[styles.suggestionChip, Shadow.sm]} onPress={() => setInput(s.text)} activeOpacity={0.7}>
                      <View style={[styles.suggestionIcon, { backgroundColor: s.color + '15' }]}><Ionicons name={s.icon as any} size={18} color={s.color} /></View>
                      <Text style={styles.suggestionText}>{s.text}</Text>
                      <Ionicons name="arrow-forward" size={14} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          }
          renderItem={({ item }) => (
            <Animated.View entering={FadeInUp.duration(300)}>
              {item.role === 'user' ? (
                <View style={styles.userBubbleWrap}>
                  <LinearGradient colors={[Colors.green, Colors.greenDark]} style={styles.userBubble}>
                    <Text style={styles.userBubbleText}>{item.content}</Text>
                  </LinearGradient>
                </View>
              ) : (
                <View style={styles.aiBubbleWrap}>
                  <View style={styles.aiIconSmall}><Ionicons name="sparkles" size={12} color={Colors.green} /></View>
                  <View style={[styles.aiBubble, Shadow.sm]}>
                    <Text style={styles.aiBubbleText}>{item.content}</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          )}
        />

        {sending && (
          <View style={styles.typingRow}>
            <View style={styles.typingDots}><Text style={styles.typingText}>BO Coach is typing...</Text></View>
          </View>
        )}

        <View style={[styles.inputRow, Shadow.sm]}>
          <TextInput testID="chat-input" style={styles.chatInput} value={input} onChangeText={setInput} placeholder="Ask your wellness coach..." placeholderTextColor={Colors.textTertiary} multiline maxLength={500} />
          <TouchableOpacity testID="chat-send-button" onPress={sendMessage} disabled={!input.trim() || sending} activeOpacity={0.7}>
            <LinearGradient colors={(!input.trim() || sending) ? [Colors.textTertiary, Colors.textTertiary] : [Colors.green, Colors.greenDark]} style={styles.sendBtn}>
              {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  header: { backgroundColor: '#FFF' },
  headerGradient: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '800' },
  headerSub: { color: Colors.textTertiary, fontSize: FontSize.caption },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  statusText: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '600' },
  chatList: { padding: Spacing.md, paddingBottom: Spacing.lg, flexGrow: 1 },
  userBubbleWrap: { alignItems: 'flex-end', marginBottom: Spacing.sm },
  userBubble: { maxWidth: '80%', borderRadius: Radius.lg, borderBottomRightRadius: 4, padding: Spacing.md },
  userBubbleText: { color: '#FFF', fontSize: FontSize.body, lineHeight: 22 },
  aiBubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: Spacing.sm },
  aiIconSmall: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  aiBubble: { maxWidth: '78%', borderRadius: Radius.lg, borderBottomLeftRadius: 4, padding: Spacing.md, backgroundColor: '#FFF' },
  aiBubbleText: { color: Colors.textPrimary, fontSize: FontSize.body, lineHeight: 22 },
  emptyChat: { alignItems: 'center', paddingTop: 40, paddingHorizontal: Spacing.lg },
  welcomeIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  welcomeTitle: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '800', marginTop: Spacing.md },
  welcomeSub: { color: Colors.textSecondary, fontSize: FontSize.small, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 },
  suggestions: { marginTop: Spacing.xl, gap: Spacing.sm, width: '100%' },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md },
  suggestionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  suggestionText: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.small, fontWeight: '500' },
  typingRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  typingDots: { backgroundColor: Colors.greenLight, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: Spacing.md, alignSelf: 'flex-start' },
  typingText: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: '#FFF' },
  chatInput: { flex: 1, backgroundColor: Colors.greenLight, borderRadius: Radius.lg, paddingVertical: 12, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body, maxHeight: 100, outlineStyle: 'none' as any },
  sendBtn: { borderRadius: Radius.lg, padding: 14 },
});
