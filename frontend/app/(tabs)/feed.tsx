import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>Community Feed</Text>
        <View style={styles.newPostCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text></View>
          <TextInput testID="feed-post-input" style={styles.postInput} value={newPost} onChangeText={setNewPost} placeholder="Share your wellness journey..." placeholderTextColor={Colors.textMuted} multiline />
          <TouchableOpacity testID="feed-post-submit" onPress={createPost} style={styles.sendBtn} activeOpacity={0.7}><Ionicons name="send" size={20} color="#FFF" /></TouchableOpacity>
        </View>
        <FlatList data={posts} keyExtractor={item => item.id} contentContainerStyle={styles.feedList}
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.postAvatar}><Text style={styles.postAvatarText}>{item.user_name?.[0] || 'U'}</Text></View>
                <View><Text style={styles.postUserName}>{item.user_name}</Text><Text style={styles.postTime}>{timeAgo(item.created_at)}</Text></View>
              </View>
              <Text style={styles.postContent}>{item.content}</Text>
              <View style={styles.postActions}>
                <TouchableOpacity testID={`like-${item.id}`} style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
                  <Ionicons name={item.liked_by_me ? 'heart' : 'heart-outline'} size={20} color={item.liked_by_me ? Colors.danger : Colors.textMuted} /><Text style={styles.actionText}>{item.like_count || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity testID={`comment-${item.id}`} style={styles.actionBtn} onPress={() => loadComments(item.id)}>
                  <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} /><Text style={styles.actionText}>{item.comment_count || 0}</Text>
                </TouchableOpacity>
              </View>
              {showComments === item.id && (
                <View style={styles.commentsSection}>
                  {comments.map(c => (<View key={c.id} style={styles.commentItem}><Text style={styles.commentUser}>{c.user_name}</Text><Text style={styles.commentContent}>{c.content}</Text></View>))}
                  <View style={styles.commentInputRow}>
                    <TextInput style={styles.commentInput} value={newComment} onChangeText={setNewComment} placeholder="Add comment..." placeholderTextColor={Colors.textMuted} />
                    <TouchableOpacity onPress={() => addComment(item.id)} style={styles.commentSend}><Ionicons name="send" size={16} color={Colors.green} /></TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No posts yet. Be the first!</Text></View>}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  title: { color: Colors.textPrimary, fontSize: FontSize.h2, fontWeight: '700', paddingHorizontal: Spacing.md, paddingTop: Spacing.md, marginBottom: Spacing.md },
  newPostCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgSurface, marginHorizontal: Spacing.md, borderRadius: Radius.lg, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  postInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.body, maxHeight: 80, paddingVertical: Spacing.xs },
  sendBtn: { backgroundColor: Colors.green, borderRadius: Radius.sm, padding: Spacing.sm },
  feedList: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  postCard: { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  postAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  postAvatarText: { color: Colors.green, fontWeight: '700', fontSize: 13 },
  postUserName: { color: Colors.textPrimary, fontWeight: '600', fontSize: FontSize.body },
  postTime: { color: Colors.textMuted, fontSize: FontSize.small },
  postContent: { color: Colors.textPrimary, fontSize: FontSize.body, lineHeight: 22, marginBottom: Spacing.sm },
  postActions: { flexDirection: 'row', gap: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: Colors.textMuted, fontSize: FontSize.caption },
  commentsSection: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  commentItem: { marginBottom: Spacing.sm },
  commentUser: { color: Colors.green, fontWeight: '600', fontSize: FontSize.caption },
  commentContent: { color: Colors.textSecondary, fontSize: FontSize.caption },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  commentInput: { flex: 1, backgroundColor: Colors.bgBase, borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.caption, borderWidth: 1, borderColor: Colors.border },
  commentSend: { padding: 6 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.md },
});
