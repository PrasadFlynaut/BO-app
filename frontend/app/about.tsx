import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import Constants from 'expo-constants';
import api from '@/src/api';

const boLogo = require('../assets/images/bo-logo-color.png');

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/v1/legal/about');
        setContent(data.content || '');
      } catch (e) {
        console.error('Failed to load about content:', e);
      }
      setLoading(false);
    })();
  }, []);

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <Text key={i} style={s.h1}>{line.replace(/^# /, '')}</Text>;
      if (line.startsWith('## ')) return <Text key={i} style={s.h2}>{line.replace(/^## /, '')}</Text>;
      if (line.startsWith('### ')) return <Text key={i} style={s.h3}>{line.replace(/^### /, '')}</Text>;
      if (line.startsWith('- ')) return (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bullet}>{'•'}</Text>
          <Text style={s.bulletText}>{line.replace(/^- /, '')}</Text>
        </View>
      );
      if (line.startsWith('**') && line.endsWith('**')) return <Text key={i} style={s.bold}>{line.replace(/\*\*/g, '')}</Text>;
      if (line.trim() === '') return <View key={i} style={{ height: 8 }} />;
      // Inline bold: replace **text** within a line
      if (line.includes('**')) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <Text key={i} style={s.paragraph}>
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <Text key={j} style={s.inlineBold}>{p.replace(/\*\*/g, '')}</Text>
                : p
            )}
          </Text>
        );
      }
      return <Text key={i} style={s.paragraph}>{line}</Text>;
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About BO</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Brand header — always static */}
        <Animated.View entering={FadeInDown.duration(350)} style={s.logoWrap}>
          <Image source={boLogo} style={s.logoImg} contentFit="contain" />
          <Text style={s.appName}>BO</Text>
          <Text style={s.tagline}>Your Health, On The Go</Text>
          <View style={s.versionBadge}>
            <Text style={s.versionText}>Version {version} (Build {buildNumber})</Text>
          </View>
        </Animated.View>

        {/* Admin-managed content */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)} style={[s.card, Shadow.sm]}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.green} style={{ marginVertical: 24 }} />
          ) : content ? (
            renderMarkdown(content)
          ) : (
            <Text style={s.paragraph}>BO was inspired by two matriarchs and stands for Bananas and Okra. We help you discover your healthiest self through personalized nutrition, smart activity tracking, AI-powered wellness insights, and a supportive community, all in one app.</Text>
          )}
        </Animated.View>

        {/* Social Links */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)} style={s.socialRow}>
          {[
            { icon: 'globe-outline', url: 'https://bo.app', label: 'Website' },
            { icon: 'logo-instagram', url: 'https://instagram.com/boapp', label: 'Instagram' },
            { icon: 'logo-facebook', url: 'https://facebook.com/boapp', label: 'Facebook' },
            { icon: 'logo-twitter', url: 'https://twitter.com/boapp', label: 'Twitter' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.socialBtn} onPress={() => Linking.openURL(item.url)}>
              <Ionicons name={item.icon as any} size={20} color={Colors.green} />
              <Text style={s.socialLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Legal Links */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)} style={{ width: '100%', marginBottom: 12 }}>
          <TouchableOpacity style={s.legalRow} onPress={() => router.push('/privacy-screen')}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textTertiary} />
            <Text style={s.legalText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.legalRow} onPress={() => router.push('/terms')}>
            <Ionicons name="reader-outline" size={18} color={Colors.textTertiary} />
            <Text style={s.legalText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.legalRow} onPress={() => Linking.openURL('mailto:support@bo.app')}>
            <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} />
            <Text style={s.legalText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>

        <Text style={s.copyright}>{'©'} 2026 BO by Flynaut LLC. All rights reserved.</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  body: { alignItems: 'center', padding: Spacing.lg },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  logoImg: { width: 80, height: 80, marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary },
  tagline: { fontSize: FontSize.body, color: '#666666', marginTop: 4 },
  versionBadge: { marginTop: 8, backgroundColor: Colors.greenLight, paddingHorizontal: 14, paddingVertical: 4, borderRadius: Radius.pill },
  versionText: { fontSize: FontSize.caption, color: Colors.green, fontWeight: '600' },
  card: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, width: '100%' },
  h1: { fontSize: FontSize.h2, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.sm, marginBottom: 6 },
  h2: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: 4 },
  h3: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginTop: 10, marginBottom: 2 },
  bold: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary, marginVertical: 4 },
  inlineBold: { fontWeight: '700', color: Colors.textPrimary },
  paragraph: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 24 },
  bulletRow: { flexDirection: 'row', gap: 8, marginVertical: 2 },
  bullet: { fontSize: FontSize.body, color: Colors.green, lineHeight: 24, marginTop: 1 },
  bulletText: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 24, flex: 1 },
  socialRow: { flexDirection: 'row', gap: 12, marginVertical: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.greenLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill },
  socialLabel: { fontSize: FontSize.small, color: Colors.green, fontWeight: '600' },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  legalText: { fontSize: FontSize.body, color: Colors.textSecondary, flex: 1 },
  copyright: { fontSize: FontSize.caption, color: '#9CA3AF', marginTop: Spacing.sm },
});
