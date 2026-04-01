import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Share, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

export default function InviteFriendsScreen() {
  const router = useRouter();
  const [referral, setReferral] = useState<{ code: string | null; inviteLink: string | null; invitedCount: number; joinedCount: number }>({ code: null, inviteLink: null, invitedCount: 0, joinedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferral();
  }, []);

  const loadReferral = async () => {
    try {
      let { data } = await api.get('/v1/referrals');
      if (!data.code) {
        const gen = await api.post('/v1/referrals/generate');
        data = { code: gen.data.referralCode, inviteLink: gen.data.inviteLink, invitedCount: 0, joinedCount: 0 };
      }
      setReferral(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const copyCode = async () => {
    if (referral.code) {
      await Clipboard.setStringAsync(referral.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `Join me on BO! I have been using it to track my health and discover amazing meals. Download it here: ${referral.inviteLink || 'https://bo.app'}`,
      });
    } catch (e) { console.error(e); }
  };

  if (loading) return <SafeAreaView style={s.safe}><View style={s.header}><TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary} /></TouchableOpacity><Text style={s.headerTitle}>Invite Friends</Text><View style={{ width: 40 }} /></View><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={Colors.green} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Invite Friends</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Referral Code */}
        <Animated.View entering={FadeInDown.duration(350)} style={[s.codeCard, Shadow.sm]}>
          <Text style={s.codeLabel}>Your Referral Code</Text>
          <View style={s.codeRow}>
            <Text style={s.codeText}>{referral.code || '--------'}</Text>
            <TouchableOpacity style={s.copyBtn} onPress={copyCode}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? Colors.green : Colors.textSecondary} />
              <Text style={[s.copyText, copied && { color: Colors.green }]}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Share CTA */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)}>
          <TouchableOpacity onPress={shareInvite} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.shareBtn}>
              <Ionicons name="share-social-outline" size={20} color="#FFF" />
              <Text style={s.shareBtnText}>Share Invite Link</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Message Preview */}
        <Animated.View entering={FadeInDown.delay(180).duration(350)} style={[s.previewCard, Shadow.sm]}>
          <Text style={s.previewLabel}>Invite Message Preview</Text>
          <Text style={s.previewText}>Join me on BO! I have been using it to track my health and discover amazing meals. Download it here: {referral.inviteLink || 'https://bo.app'}</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(260).duration(350)} style={[s.statsRow]}>
          <View style={[s.statCard, Shadow.sm]}>
            <Text style={s.statNumber}>{referral.invitedCount}</Text>
            <Text style={s.statLabel}>Friends Invited</Text>
          </View>
          <View style={[s.statCard, Shadow.sm]}>
            <Text style={[s.statNumber, { color: Colors.green }]}>{referral.joinedCount}</Text>
            <Text style={s.statLabel}>Friends Joined</Text>
          </View>
        </Animated.View>

        {/* Reward teaser */}
        <Animated.View entering={FadeInDown.delay(340).duration(350)} style={s.rewardCard}>
          <Ionicons name="gift-outline" size={22} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={s.rewardTitle}>Earn Rewards!</Text>
            <Text style={s.rewardSub}>Invite 5 friends and earn a Pro trial!</Text>
          </View>
        </Animated.View>
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
  body: { padding: Spacing.md },
  codeCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  codeLabel: { fontSize: FontSize.caption, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: Colors.green + '40', borderStyle: 'dashed', borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 12 },
  codeText: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 3, fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.pill, paddingVertical: 16, marginBottom: Spacing.md },
  shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  previewCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  previewLabel: { fontSize: FontSize.caption, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },
  previewText: { fontSize: FontSize.small, color: Colors.textSecondary, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.caption, color: '#666666', marginTop: 4 },
  rewardCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFF8E1', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: '#F59E0B30' },
  rewardTitle: { fontSize: FontSize.body, fontWeight: '700', color: '#92400E' },
  rewardSub: { fontSize: FontSize.small, color: '#B45309', marginTop: 2 },
});
