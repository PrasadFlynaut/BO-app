import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
import api from '@/src/api';

export default function TermsScreen() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/v1/legal/terms');
        setContent(data.content || '');
        setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : '');
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <Text key={i} style={s.h1}>{line.replace('# ', '')}</Text>;
      if (line.startsWith('## ')) return <Text key={i} style={s.h2}>{line.replace('## ', '')}</Text>;
      if (line.startsWith('**') && line.endsWith('**')) return <Text key={i} style={s.bold}>{line.replace(/\*\*/g, '')}</Text>;
      if (line.trim() === '') return <View key={i} style={{ height: 8 }} />;
      return <Text key={i} style={s.paragraph}>{line}</Text>;
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms of Use</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {lastUpdated ? <Text style={s.updated}>Last updated: {lastUpdated}</Text> : null}
          {renderMarkdown(content)}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: Spacing.lg },
  updated: { fontSize: FontSize.caption, color: '#9CA3AF', marginBottom: Spacing.md },
  h1: { fontSize: FontSize.h2, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  h2: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  bold: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginVertical: 4 },
  paragraph: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 24 },
});
