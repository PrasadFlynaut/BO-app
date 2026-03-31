import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

export default function FeedScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useFocusEffect(useCallback(() => { loadFeed(); }, []));
  const loadFeed = async () => { try { const { data } = await api.get('/feed'); setPosts(data.posts); } catch (e) { console.error(e); } };
  const createPost = async () => { if (!newPost.trim()) return; try { await api.post('/feed', { content: newPost }); setNewPost(''); await loadFeed(); } catch (e) { console.error(e); } };
  const toggleLike = async (postId: string) => { try { const { data } = await api.post(`/feed/${postId}/like`); setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: data.liked, like_count: data.like_count } : p)); } catch (e) { console.error(e); } };
  const loadComments = async (postId: string) => { if (showComments === postId) { setShowComments(null); return; } try { const { data } = await api.get(`/feed/${postId}/comments`); setComments(data.comments); setShowComments(postId); } catch (e) { console.error(e); } };
  const addComment = async (postId: string) => { if (!newComment.trim()) return; try { await api.post(`/feed/${postId}/comment`, { content: newComment }); setNewComment(''); await loadComments(postId); await loadFeed(); } catch (e) { console.error(e); } };
  const timeAgo = (d: string) => { const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h`; return `${Math.floor(hrs / 24)}d`; };

  const AVATAR_COLORS = ['#26B50F', '#3A86FF', '#FF9F1C', '#8338EC', '#06D6A0', '#FF5252'];
  const getAvatarColor = (name: string) => AVATAR_COLORS[name?.charCodeAt(0) % AVATAR_COLORS.length || 0];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>Share your wellness journey</Text>
        </Animated.View>

        {/* New Post */}
        <View style={[styles.newPostCard, Shadow.sm]}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(user?.name || 'U') }]}><Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text></View>
          <TextInput testID="feed-post-input" style={styles.postInput} value={newPost} onChangeText={setNewPost} placeholder="What's on your mind?" placeholderTextColor={Colors.textTertiary} multiline />
          <TouchableOpacity testID="feed-post-submit" onPress={createPost} activeOpacity={0.7}>
            <LinearGradient colors={[Colors.green, Colors.greenDark]} style={styles.sendBtn}><Ionicons name="send" size={18} color="#FFF" /></LinearGradient>
          </TouchableOpacity>
        </View>

        <FlatList data={posts} keyExtractor={item => item.id} contentContainerStyle={styles.feedList}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
              <View style={[styles.postCard, Shadow.sm]}>
                <View style={styles.postHeader}>
                  <View style={[styles.postAvatar, { backgroundColor: getAvatarColor(item.user_name) }]}><Text style={styles.postAvatarText}>{item.user_name?.[0] || 'U'}</Text></View>
                  <View style={{ flex: 1 }}><Text style={styles.postUserName}>{item.user_name}</Text><Text style={styles.postTime}>{timeAgo(item.created_at)}</Text></View>
                  <TouchableOpacity><Ionicons name="ellipsis-horizontal" size={18} color={Colors.textTertiary} /></TouchableOpacity>
                </View>
                <Text style={styles.postContent}>{item.content}</Text>
                <View style={styles.postActions}>
                  <TouchableOpacity testID={`like-${item.id}`} style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
                    <Ionicons name={item.liked_by_me ? 'heart' : 'heart-outline'} size={22} color={item.liked_by_me ? '#FF5252' : Colors.textTertiary} /><Text style={[styles.actionText, item.liked_by_me && { color: '#FF5252' }]}>{item.like_count || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`comment-${item.id}`} style={styles.actionBtn} onPress={() => loadComments(item.id)}>
                    <Ionicons name="chatbubble-outline" size={20} color={Colors.textTertiary} /><Text style={styles.actionText}>{item.comment_count || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}><Ionicons name="share-outline" size={20} color={Colors.textTertiary} /></TouchableOpacity>
                </View>
                {showComments === item.id && (
                  <View style={styles.commentsSection}>
                    {comments.map(c => (<View key={c.id} style={styles.commentItem}><Text style={[styles.commentUser, { color: getAvatarColor(c.user_name) }]}>{c.user_name}</Text><Text style={styles.commentContent}>{c.content}</Text></View>))}
                    <View style={styles.commentInputRow}>
                      <TextInput style={styles.commentInput} value={newComment} onChangeText={setNewComment} placeholder="Add comment..." placeholderTextColor={Colors.textTertiary} />
                      <TouchableOpacity onPress={() => addComment(item.id)}><Ionicons name="send" size={16} color={Colors.green} /></TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="people-outline" size={56} color={Colors.textTertiary} /><Text style={styles.emptyTitle}>No Posts Yet</Text><Text style={styles.emptyText}>Be the first to share!</Text></View>}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  title: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '800', paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.small, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  newPostCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FFF', marginHorizontal: Spacing.md, borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  postInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.body, maxHeight: 80, paddingVertical: Spacing.xs },
  sendBtn: { borderRadius: 14, padding: 10 },
  feedList: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  postCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  postAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  postAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  postUserName: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.body },
  postTime: { color: Colors.textTertiary, fontSize: FontSize.caption },
  postContent: { color: Colors.textPrimary, fontSize: FontSize.body, lineHeight: 24, marginBottom: Spacing.sm },
  postActions: { flexDirection: 'row', gap: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: Colors.textTertiary, fontSize: FontSize.small, fontWeight: '600' },
  commentsSection: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  commentItem: { marginBottom: Spacing.sm },
  commentUser: { fontWeight: '700', fontSize: FontSize.caption },
  commentContent: { color: Colors.textSecondary, fontSize: FontSize.small },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  commentInput: { flex: 1, backgroundColor: Colors.greenLight, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.small },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.h3, fontWeight: '700', marginTop: Spacing.md },
  emptyText: { color: Colors.textTertiary, fontSize: FontSize.small, marginTop: 4 },
});
