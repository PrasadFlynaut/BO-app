import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, FlatList, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

type Program = {
  id: string; title: string; description: string; short_description: string;
  image_url: string; duration: string; video_count: number; category: string;
};

type VideoItem = {
  id: string; title: string; description: string; url: string;
  duration: number; watched: boolean;
};

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const loadProgram = async () => {
    try {
      const { data } = await api.get(`/v1/programs/${id}`);
      setProgram(data);
    } catch { }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadProgram(); }, [id]));

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await api.post(`/v1/programs/${id}/enroll`);
      await loadProgram();
      Alert.alert('Enrolled!', 'You are now enrolled in this program.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not enroll');
    }
    setEnrolling(false);
  };

  const handleVideoComplete = async (videoId: string) => {
    try {
      await api.post(`/v1/programs/videos/${videoId}/progress`);
      await loadProgram();
    } catch { }
  };

  if (loading) return (
    <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={Colors.green} /></View></SafeAreaView>
  );

  if (!program) return (
    <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.emptyText}>Program not found</Text></View></SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{program.title}</Text>
        </View>

        {/* Hero image */}
        {program.image_url ? (
          <Image source={{ uri: program.image_url }} style={s.heroImg} contentFit="cover" transition={200}
            accessibilityLabel={`${program.title} program image`} />
        ) : (
          <View style={[s.heroImg, { backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="fitness" size={48} color={Colors.green} />
          </View>
        )}

        {/* Info */}
        <View style={s.infoSection}>
          <Text style={s.title}>{program.title}</Text>
          <Text style={s.desc}>{program.description}</Text>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="videocam" size={16} color={Colors.green} />
              <Text style={s.metaText}>{program.video_count} videos</Text>
            </View>
            {program.duration ? (
              <View style={s.metaItem}>
                <Ionicons name="time" size={16} color={Colors.green} />
                <Text style={s.metaText}>{program.duration}</Text>
              </View>
            ) : null}
            <View style={s.metaItem}>
              <Ionicons name="trophy" size={16} color={Colors.green} />
              <Text style={s.metaText}>{program.completion_percentage}% complete</Text>
            </View>
          </View>

          {/* Enroll button */}
          {program.enrolled ? (
            <View style={[s.enrollBtn, { backgroundColor: Colors.greenLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
              <Text style={[s.enrollText, { color: Colors.green }]}>Enrolled</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.enrollBtn} onPress={handleEnroll} disabled={enrolling} activeOpacity={0.8}
              accessibilityLabel="Enroll in this program">
              {enrolling ? <ActivityIndicator color="#FFF" size="small" /> : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFF" />
                  <Text style={s.enrollText}>Enroll Now</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Video content list */}
        <View style={s.contentSection}>
          <Text style={s.sectionTitle}>Program Content</Text>
          {program.videos?.length === 0 ? (
            <Text style={s.emptyText}>No content available yet. Check back soon.</Text>
          ) : (
            program.videos?.map((video: VideoItem, idx: number) => (
              <View key={video.id} style={[s.videoCard, Shadow.sm]}>
                <View style={s.videoHeader}>
                  <View style={s.videoNum}>
                    {video.watched ? (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.green} />
                    ) : (
                      <Text style={s.videoNumText}>{idx + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.videoTitle}>{video.title}</Text>
                    <Text style={s.videoSub}>Video {idx + 1} of {program.video_count}</Text>
                  </View>
                  {program.enrolled && (
                    <TouchableOpacity
                      onPress={() => setPlayingVideo(playingVideo === video.id ? null : video.id)}
                      style={s.playBtn}
                      accessibilityLabel={`Play ${video.title}`}
                    >
                      <Ionicons name={playingVideo === video.id ? 'pause' : 'play'} size={20} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>

                {video.description ? <Text style={s.videoDesc}>{video.description}</Text> : null}

                {playingVideo === video.id && program.enrolled && video.url && (
                  <View style={s.playerWrap}>
                    <Video
                      source={{ uri: video.url.startsWith('/') ? `${api.defaults.baseURL?.replace('/api', '')}${video.url}` : video.url }}
                      style={s.player}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      onPlaybackStatusUpdate={(status: any) => {
                        if (status.isLoaded && status.durationMillis && status.positionMillis) {
                          const pct = status.positionMillis / status.durationMillis;
                          if (pct >= 0.8 && !video.watched) {
                            handleVideoComplete(video.id);
                          }
                        }
                      }}
                    />
                  </View>
                )}

                {!program.enrolled && (
                  <View style={s.lockedOverlay}>
                    <Ionicons name="lock-closed" size={16} color={Colors.textTertiary} />
                    <Text style={s.lockedText}>Enroll to access this content</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  heroImg: { width: '100%', height: 200, borderRadius: 0 },
  infoSection: { padding: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  desc: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSize.small, color: Colors.textSecondary },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.green, borderRadius: Radius.lg, padding: 14 },
  enrollText: { fontSize: FontSize.body, fontWeight: '700', color: '#FFF' },
  contentSection: { padding: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  emptyText: { fontSize: FontSize.body, color: Colors.textTertiary, textAlign: 'center' },
  videoCard: { backgroundColor: '#FFF', borderRadius: Radius.md, padding: 16, marginBottom: 12 },
  videoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  videoNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  videoNumText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.green },
  videoTitle: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textPrimary },
  videoSub: { fontSize: FontSize.caption, color: Colors.textTertiary },
  videoDesc: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  playerWrap: { marginTop: 12, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000' },
  player: { width: '100%', height: 200 },
  lockedOverlay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8 },
  lockedText: { fontSize: FontSize.small, color: Colors.textTertiary },
});
