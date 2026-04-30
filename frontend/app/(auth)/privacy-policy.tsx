import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

export default function PrivacyPolicyScreen() {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/v1/legal/privacy');
        setContent(data.content || '');
        setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : '');
      } catch (e) {
        console.error('Failed to load privacy policy:', e);
      }
      setLoading(false);
    })();
  }, []);

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50) {
      setScrolledToEnd(true);
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <Text key={i} style={s.h1}>{line.replace(/^# /, '')}</Text>;
      if (line.startsWith('## ')) return <Text key={i} style={s.sectionTitle}>{line.replace(/^## /, '')}</Text>;
      if (line.startsWith('- ')) return (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bullet}>{'•'}</Text>
          <Text style={s.sectionBody}>{line.replace(/^- /, '')}</Text>
        </View>
      );
      if (line.startsWith('**') && line.endsWith('**')) return <Text key={i} style={[s.sectionBody, { fontWeight: '700', color: Colors.textPrimary }]}>{line.replace(/\*\*/g, '')}</Text>;
      if (line.trim() === '') return <View key={i} style={{ height: 8 }} />;
      if (line.includes('**')) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <Text key={i} style={s.sectionBody}>
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <Text key={j} style={{ fontWeight: '700', color: Colors.textPrimary }}>{p.replace(/\*\*/g, '')}</Text>
                : p
            )}
          </Text>
        );
      }
      return <Text key={i} style={s.sectionBody}>{line}</Text>;
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.content}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.badge}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.green} />
          <Text style={s.badgeText}>BO Wellness Privacy Policy</Text>
        </View>
        {lastUpdated ? <Text style={s.lastUpdated}>Last updated: {lastUpdated}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.green} style={{ marginVertical: 40 }} />
        ) : content ? (
          <View style={s.markdownWrap}>{renderMarkdown(content)}</View>
        ) : (
          <Text style={s.sectionBody}>
            At BO (Bananas and Okra), we are committed to protecting your privacy and ensuring the security of your personal health information. Please review our full privacy policy at bo.app/privacy.
          </Text>
        )}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={{ width: '100%' }}>
          <LinearGradient colors={[Colors.green, Colors.greenDark]} style={[s.agreeBtn, Shadow.md]}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={s.agreeBtnText}>I Agree</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.greenLight, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, alignSelf: 'flex-start', marginBottom: Spacing.md },
  badgeText: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.green },
  lastUpdated: { fontSize: FontSize.caption, color: Colors.textTertiary, marginBottom: Spacing.lg },
  markdownWrap: { width: '100%' },
  h1: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  sectionTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionBody: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', gap: 8, marginVertical: 2, paddingLeft: 4 },
  bullet: { fontSize: FontSize.small, color: Colors.green, lineHeight: 22 },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  agreeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, paddingVertical: 18 },
  agreeBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
});
