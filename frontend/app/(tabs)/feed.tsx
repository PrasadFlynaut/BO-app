import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Image,
  TextInput, Modal, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView, Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_COLORS = ['#26B50F', '#3A86FF', '#FF9F1C', '#8338EC', '#06D6A0', '#FF5252', '#E91E63', '#00BCD4'];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

// Separate component to avoid hooks-in-callbacks issue
function PostCard({ item, index, isOwner, showPostMenu, setShowPostMenu, handleDeletePost, handleOpenDetail, handleLike, handleViewLikes }: any) {
  const [expanded, setExpanded] = React.useState(false);
  const hasImage = item.media_urls && item.media_urls.length > 0 && item.media_type === 'image';
  const textTruncated = item.text && item.text.length > 150;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 50).duration(350)}>
      <View style={[s.postCard, Shadow.sm]}>
        {/* Header */}
        <View style={s.postHeader}>
          <View style={[s.avatar, { backgroundColor: getAvatarColor(item.user_name) }]}>
            <Text style={s.avatarText}>{getInitials(item.user_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{item.user_name || 'User'}</Text>
            <Text style={s.timeAgo}>{item.time_ago || ''}</Text>
          </View>
          {isOwner && (
            <TouchableOpacity
              onPress={() => setShowPostMenu(showPostMenu === item.id ? null : item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Post menu */}
        {showPostMenu === item.id && isOwner && (
          <View style={s.postMenuDropdown}>
            <TouchableOpacity style={s.postMenuItem} onPress={() => handleDeletePost(item.id)}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              <Text style={[s.postMenuText, { color: Colors.danger }]}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Text */}
        {item.text ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenDetail(item)}>
            <Text style={s.postText}>
              {textTruncated && !expanded ? item.text.substring(0, 150) + '...' : item.text}
            </Text>
            {textTruncated && !expanded && (
              <TouchableOpacity onPress={() => setExpanded(true)}>
                <Text style={s.readMore}>Read more</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Image */}
        {hasImage && (
          <TouchableOpacity activeOpacity={0.95} onPress={() => handleOpenDetail(item)}>
            <Image source={{ uri: item.media_urls[0] }} style={s.postImage} resizeMode="cover" />
            {item.media_urls.length > 1 && (
              <View style={s.imageCount}>
                <Text style={s.imageCountText}>+{item.media_urls.length - 1}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => handleLike(item.id)} activeOpacity={0.7}>
            <Ionicons
              name={item.liked_by_me ? 'heart' : 'heart-outline'}
              size={24}
              color={item.liked_by_me ? '#E53E3E' : Colors.textTertiary}
            />
            <TouchableOpacity onPress={() => item.like_count > 0 && handleViewLikes(item.id)}>
              <Text style={[s.actionCount, item.liked_by_me && { color: '#E53E3E' }]}>
                {item.like_count || 0}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionBtn} onPress={() => handleOpenDetail(item)} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.textTertiary} />
            <Text style={s.actionCount}>{item.comment_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Create post
  const [showCreate, setShowCreate] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Post detail / comments
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);

  // Likes bottom sheet
  const [showLikes, setShowLikes] = useState(false);
  const [likeUsers, setLikeUsers] = useState<any[]>([]);

  useFocusEffect(useCallback(() => { loadFeed(1, true); }, []));

  const loadFeed = async (p: number = 1, reset: boolean = false) => {
    if (reset) setLoading(true);
    try {
      const { data } = await api.get(`/v1/feed?page=${p}&limit=10`);
      const newPosts = data.data || [];
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      setHasMore(data.pagination?.hasNext || false);
      setPage(p);
    } catch (e) { console.error('Feed load error:', e); }
    setLoading(false);
    setLoadingMore(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed(1, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    loadFeed(page + 1, false);
  };

  // Create post
  const handleCreatePost = async () => {
    if (!postText.trim() && postImages.length === 0) return;
    setCreating(true);
    try {
      await api.post('/v1/feed', { text: postText.trim(), mediaUrls: postImages });
      setPostText('');
      setPostImages([]);
      setShowCreate(false);
      await loadFeed(1, true);
    } catch (e) { console.error('Create post error:', e); }
    setCreating(false);
  };

  // Like toggle
  const handleLike = async (postId: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const newLiked = !p.liked_by_me;
        return {
          ...p,
          liked_by_me: newLiked,
          like_count: newLiked ? (p.like_count || 0) + 1 : Math.max(0, (p.like_count || 0) - 1),
        };
      }
      return p;
    }));
    try {
      await api.post(`/v1/post/like/${postId}`);
    } catch (e) {
      // Rollback
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, liked_by_me: !p.liked_by_me, like_count: p.liked_by_me ? (p.like_count || 0) + 1 : Math.max(0, (p.like_count || 0) - 1) };
        }
        return p;
      }));
    }
  };

  // View likes
  const handleViewLikes = async (postId: string) => {
    try {
      const { data } = await api.get(`/v1/post/likes/${postId}`);
      setLikeUsers(data.users || []);
      setShowLikes(true);
    } catch (e) { console.error(e); }
  };

  // Open comments/detail
  const handleOpenDetail = async (post: any) => {
    setSelectedPost(post);
    setShowDetail(true);
    setLoadingComments(true);
    try {
      const { data } = await api.get(`/v1/post/comments/${post.id}?page=1&limit=50`);
      setComments(data.data || []);
    } catch (e) { console.error(e); }
    setLoadingComments(false);
  };

  // Add comment
  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    const text = commentText.trim();
    setCommentText('');
    Keyboard.dismiss();
    try {
      const { data } = await api.post(`/v1/post/comment/${selectedPost.id}`, { text });
      setComments(prev => [...prev, data.comment]);
      // Update post comment count
      setPosts(prev => prev.map(p =>
        p.id === selectedPost.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
      ));
      setSelectedPost((prev: any) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
    } catch (e) { console.error(e); }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    try {
      await api.delete(`/v1/feed/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setShowPostMenu(null);
      if (showDetail && selectedPost?.id === postId) setShowDetail(false);
    } catch (e) { console.error(e); }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost) return;
    try {
      await api.delete(`/v1/post/${selectedPost.id}/comment/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPosts(prev => prev.map(p =>
        p.id === selectedPost.id ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) } : p
      ));
    } catch (e) { console.error(e); }
  };

  // ============ RENDER POST CARD ============
  const renderPost = ({ item, index }: { item: any; index: number }) => {
    return <PostCard item={item} index={index} isOwner={item.user_id === user?.id} showPostMenu={showPostMenu} setShowPostMenu={setShowPostMenu} handleDeletePost={handleDeletePost} handleOpenDetail={handleOpenDetail} handleLike={handleLike} handleViewLikes={handleViewLikes} />;
  };

  // ============ SKELETON ============
  const renderSkeleton = () => (
    <View style={{ padding: Spacing.md, gap: Spacing.md }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[s.postCard, Shadow.sm, { opacity: 0.5 }]}>
          <View style={s.postHeader}>
            <View style={[s.avatar, { backgroundColor: '#E0E0E0' }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: 120, height: 14, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
              <View style={{ width: 60, height: 10, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
            </View>
          </View>
          <View style={{ height: 14, backgroundColor: '#E0E0E0', borderRadius: 4, marginTop: 12 }} />
          <View style={{ height: 14, backgroundColor: '#E0E0E0', borderRadius: 4, marginTop: 6, width: '70%' }} />
          <View style={{ height: 180, backgroundColor: '#E0E0E0', borderRadius: 12, marginTop: 12 }} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(350)} style={s.headerBar}>
        <View>
          <Text style={s.headerTitle}>Feed</Text>
          <Text style={s.headerSubtitle}>Share anything you want.</Text>
        </View>
        <TouchableOpacity
          style={[s.profileBtn, { backgroundColor: getAvatarColor(user?.name || 'U') }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={s.profileBtnText}>{getInitials(user?.name || 'U')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Feed List */}
      {loading ? renderSkeleton() : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 120, gap: Spacing.md }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ paddingVertical: 20 }} color={Colors.green} /> : null}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(500)} style={s.emptyState}>
              <Ionicons name="people-outline" size={64} color={Colors.textTertiary} />
              <Text style={s.emptyTitle}>No posts yet.</Text>
              <Text style={s.emptySubtitle}>Be the first to share!</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnText}>Create Post</Text>
              </TouchableOpacity>
            </Animated.View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, Shadow.lg]}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <LinearGradient colors={[Colors.green, Colors.greenDark]} style={s.fabGradient}>
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ============ CREATE POST MODAL ============ */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.createSafe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.createHeader}>
              <TouchableOpacity onPress={() => { setShowCreate(false); setPostText(''); setPostImages([]); }}>
                <Text style={s.createCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={s.createTitle}>New Post</Text>
              <TouchableOpacity
                onPress={handleCreatePost}
                disabled={creating || (!postText.trim() && postImages.length === 0)}
                style={[s.postBtn, (!postText.trim() && postImages.length === 0) && { opacity: 0.5 }]}
              >
                {creating ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.postBtnText}>Post</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.createBody}>
              <View style={s.createUserRow}>
                <View style={[s.avatar, { backgroundColor: getAvatarColor(user?.name || 'U') }]}>
                  <Text style={s.avatarText}>{getInitials(user?.name || 'U')}</Text>
                </View>
                <Text style={s.createUserName}>{user?.name || 'User'}</Text>
              </View>

              <TextInput
                style={s.createInput}
                value={postText}
                onChangeText={setPostText}
                placeholder="What is on your mind?"
                placeholderTextColor={Colors.textTertiary}
                multiline
                maxLength={1000}
                autoFocus
              />

              <Text style={s.charCount}>{postText.length}/1000</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ============ POST DETAIL MODAL ============ */}
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.detailSafe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Detail Header */}
            <View style={s.detailHeader}>
              <TouchableOpacity onPress={() => { setShowDetail(false); setSelectedPost(null); setComments([]); }}>
                <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.detailHeaderTitle}>Post</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
              {selectedPost && (
                <View style={s.detailPost}>
                  {/* User info */}
                  <View style={s.postHeader}>
                    <View style={[s.avatar, { backgroundColor: getAvatarColor(selectedPost.user_name) }]}>
                      <Text style={s.avatarText}>{getInitials(selectedPost.user_name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.userName}>{selectedPost.user_name}</Text>
                      <Text style={s.timeAgo}>{selectedPost.time_ago}</Text>
                    </View>
                  </View>

                  {/* Full text */}
                  {selectedPost.text ? <Text style={s.detailText}>{selectedPost.text}</Text> : null}

                  {/* Images */}
                  {selectedPost.media_urls?.length > 0 && selectedPost.media_type === 'image' && (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                      {selectedPost.media_urls.map((url: string, i: number) => (
                        <Image key={i} source={{ uri: url }} style={s.detailImage} resizeMode="cover" />
                      ))}
                    </ScrollView>
                  )}

                  {/* Actions */}
                  <View style={[s.actionRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.md, marginTop: Spacing.md }]}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => handleLike(selectedPost.id)}>
                      <Ionicons name={selectedPost.liked_by_me ? 'heart' : 'heart-outline'} size={24} color={selectedPost.liked_by_me ? '#E53E3E' : Colors.textTertiary} />
                      <Text style={[s.actionCount, selectedPost.liked_by_me && { color: '#E53E3E' }]}>{selectedPost.like_count || 0}</Text>
                    </TouchableOpacity>
                    <View style={s.actionBtn}>
                      <Ionicons name="chatbubble-outline" size={22} color={Colors.textTertiary} />
                      <Text style={s.actionCount}>{comments.length}</Text>
                    </View>
                  </View>

                  {/* Comments */}
                  <View style={s.commentsSection}>
                    <Text style={s.commentsTitle}>Comments</Text>
                    {loadingComments ? (
                      <ActivityIndicator color={Colors.green} style={{ paddingVertical: 20 }} />
                    ) : comments.length === 0 ? (
                      <Text style={s.noComments}>No comments yet. Be the first!</Text>
                    ) : (
                      comments.map((c) => (
                        <View key={c.id} style={s.commentItem}>
                          <View style={[s.commentAvatar, { backgroundColor: getAvatarColor(c.user_name) }]}>
                            <Text style={s.commentAvatarText}>{getInitials(c.user_name)}</Text>
                          </View>
                          <View style={s.commentContent}>
                            <View style={s.commentHeader}>
                              <Text style={s.commentName}>{c.user_name}</Text>
                              {c.user_id === user?.id && (
                                <TouchableOpacity onPress={() => handleDeleteComment(c.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <Ionicons name="close-circle-outline" size={16} color={Colors.textTertiary} />
                                </TouchableOpacity>
                              )}
                            </View>
                            <Text style={s.commentText}>{c.text}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Comment input */}
            <View style={[s.commentInputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <TextInput
                style={s.commentInput}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment..."
                placeholderTextColor={Colors.textTertiary}
                maxLength={500}
              />
              <TouchableOpacity onPress={handleAddComment} disabled={!commentText.trim()}>
                <Ionicons name="send" size={22} color={commentText.trim() ? Colors.green : Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ============ LIKES BOTTOM SHEET ============ */}
      <Modal visible={showLikes} transparent animationType="slide">
        <View style={s.likesOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowLikes(false)} />
          <View style={[s.likesSheet, Shadow.lg]}>
            <View style={s.likesHandle} />
            <Text style={s.likesTitle}>Liked by</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {likeUsers.map((u, i) => (
                <View key={i} style={s.likeUserRow}>
                  <View style={[s.commentAvatar, { backgroundColor: getAvatarColor(u.name) }]}>
                    <Text style={s.commentAvatarText}>{getInitials(u.name)}</Text>
                  </View>
                  <Text style={s.likeUserName}>{u.name}</Text>
                </View>
              ))}
              {likeUsers.length === 0 && <Text style={s.noComments}>No likes yet</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF9' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  headerSubtitle: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 2 },
  profileBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  profileBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Post Card
  postCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  userName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },
  timeAgo: { color: Colors.textTertiary, fontSize: FontSize.caption, marginTop: 1 },
  postText: { color: '#1A1A1A', fontSize: 16, lineHeight: 24, marginTop: Spacing.sm },
  readMore: { color: Colors.textTertiary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  postImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.md, marginTop: Spacing.sm },
  imageCount: { position: 'absolute', top: Spacing.sm + 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  imageCountText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Post menu
  postMenuDropdown: { backgroundColor: '#FFF', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderLight, marginTop: 4, marginBottom: 4, overflow: 'hidden' },
  postMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: Spacing.md },
  postMenuText: { fontSize: 14, fontWeight: '600' },

  // Actions
  actionRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { color: Colors.textTertiary, fontSize: 14, fontWeight: '600' },

  // FAB
  fab: { position: 'absolute', bottom: 100, right: Spacing.lg, borderRadius: 28 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 100, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.h3, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: FontSize.body, color: Colors.textTertiary },
  emptyBtn: { backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 12, paddingHorizontal: 24, marginTop: Spacing.md },
  emptyBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },

  // Create post
  createSafe: { flex: 1, backgroundColor: '#FFF' },
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  createCancel: { color: Colors.textSecondary, fontSize: FontSize.body, fontWeight: '600' },
  createTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  postBtn: { backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 20 },
  postBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  createBody: { padding: Spacing.md },
  createUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  createUserName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  createInput: { fontSize: 18, color: Colors.textPrimary, lineHeight: 28, minHeight: 120, textAlignVertical: 'top' },
  charCount: { color: Colors.textTertiary, fontSize: FontSize.caption, textAlign: 'right', marginTop: Spacing.sm },

  // Detail
  detailSafe: { flex: 1, backgroundColor: '#FFF' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailHeaderTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  detailPost: { padding: Spacing.md },
  detailText: { color: '#1A1A1A', fontSize: 16, lineHeight: 26, marginTop: Spacing.md },
  detailImage: { width: SCREEN_WIDTH - Spacing.md * 2, aspectRatio: 16 / 9, borderRadius: Radius.md, marginTop: Spacing.md },

  // Comments
  commentsSection: { marginTop: Spacing.lg },
  commentsTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  noComments: { color: Colors.textTertiary, fontSize: FontSize.small, textAlign: 'center', paddingVertical: 20 },
  commentItem: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  commentContent: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: Radius.md, padding: Spacing.sm },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentName: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.textPrimary },
  commentText: { fontSize: FontSize.small, color: Colors.textSecondary, marginTop: 2, lineHeight: 20 },

  commentInputBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: '#FFF' },
  commentInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.small },

  // Likes sheet
  likesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  likesSheet: { backgroundColor: '#FFF', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  likesHandle: { width: 40, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: Spacing.md },
  likesTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  likeUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  likeUserName: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textPrimary },
});
