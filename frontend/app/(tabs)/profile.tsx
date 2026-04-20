import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
  TextInput, Modal, ActivityIndicator, Alert, Platform,
  KeyboardAvoidingView, ActionSheetIOS,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import { useAuth } from '@/src/auth';
import api from '@/src/api';

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  wellness: { bg: Colors.greenLight, color: Colors.green },
  nutrition: { bg: Colors.nutritionSurface, color: Colors.nutritionOrange },
  activity: { bg: Colors.fitnessSurface, color: Colors.fitnessPurple },
  community: { bg: Colors.socialSurface, color: Colors.socialTeal },
};

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Edit profile
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const pickProfilePhoto = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Needed', 'Camera access is required.'); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Needed', 'Gallery access is required.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      }
      if (!result.canceled && result.assets?.[0]) await uploadProfilePhoto(result.assets[0].uri);
    } catch (e) { console.error('Photo pick error:', e); }
  };

  const uploadProfilePhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri, name: filename, type } as any);
      const uploadRes = await api.post('/v1/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (uploadRes.data?.url) {
        await api.put('/auth/avatar', { avatar_url: uploadRes.data.url });
        if (refreshUser) await refreshUser();
        Alert.alert('Updated!', 'Your profile photo has been updated.');
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.response?.data?.detail || 'Could not upload photo.');
    }
    setUploadingPhoto(false);
  };

  const showPhotoOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) pickProfilePhoto('camera'); if (idx === 2) pickProfilePhoto('gallery'); }
      );
    } else {
      Alert.alert('Profile Photo', 'Choose a source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickProfilePhoto('camera') },
        { text: 'Choose from Gallery', onPress: () => pickProfilePhoto('gallery') },
      ]);
    }
  };

  // Create recipe
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [rTitle, setRTitle] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rCalories, setRCalories] = useState('');
  const [rProteins, setRProteins] = useState('');
  const [rFat, setRFat] = useState('');
  const [rCarbs, setRCarbs] = useState('');
  const [rDirections, setRDirections] = useState('');
  const [rIngredients, setRIngredients] = useState('');
  const [rCategory, setRCategory] = useState('custom');
  const [creatingRecipe, setCreatingRecipe] = useState(false);

  useFocusEffect(useCallback(() => {
    refreshUser();
    loadDashboard();
    loadBadges();
    loadRecipes();
  }, []));

  const loadDashboard = async () => {
    try { const { data } = await api.get('/dashboard'); setDashboard(data); } catch (e) { console.error(e); }
  };
  const loadBadges = async () => {
    try { const { data } = await api.get('/v1/badges'); setBadges(data.badges || []); } catch (e) { console.error(e); }
  };
  const loadRecipes = async () => {
    try { const { data } = await api.get('/v1/receipes?limit=20'); setRecipes(data.data || []); } catch (e) { console.error(e); }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadDashboard(), loadBadges(), loadRecipes()]);
    setRefreshing(false);
  };

  const handleChangePw = async () => {
    setPwError(''); setPwSuccess('');
    if (!curPw || !newPw || !confirmPw) { setPwError('All fields required'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: curPw, new_password: newPw });
      setPwSuccess('Password changed successfully!');
      setCurPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setShowChangePw(false); setPwSuccess(''); }, 1500);
    } catch (e: any) { setPwError(e.response?.data?.detail || 'Failed to change password'); }
    setPwLoading(false);
  };

  const handleEditProfile = async () => {
    setEditLoading(true);
    try {
      const payload: any = {};
      if (editName) payload.name = editName;
      if (editPhone) payload.phone = editPhone;
      if (editAddress) payload.address = editAddress;
      if (editDob) payload.date_of_birth = editDob;
      await api.put('/v1/profile/update', payload);
      await refreshUser();
      setShowEditProfile(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Update failed'); }
    setEditLoading(false);
  };

  const handleCreateRecipe = async () => {
    if (!rTitle.trim()) { Alert.alert('Error', 'Title is required'); return; }
    if (!rIngredients.trim()) { Alert.alert('Error', 'At least 1 ingredient is required'); return; }
    setCreatingRecipe(true);
    try {
      const ingredients = rIngredients.split('\n').filter(l => l.trim()).map(l => {
        const parts = l.split('-').map(s => s.trim());
        return { name: parts[0] || l.trim(), quantity: parts[1] || '' };
      });
      await api.post('/v1/receipes', {
        title: rTitle.trim(),
        description: rDesc.trim(),
        calories: parseInt(rCalories) || 0,
        proteins: parseFloat(rProteins) || 0,
        fat: parseFloat(rFat) || 0,
        carbs: parseFloat(rCarbs) || 0,
        directions: rDirections.trim(),
        ingredients,
        category: rCategory,
      });
      setShowCreateRecipe(false);
      resetRecipeForm();
      loadRecipes();
      Alert.alert('Success', 'Meal planter entry created!');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed to create meal planter entry'); }
    setCreatingRecipe(false);
  };

  const resetRecipeForm = () => {
    setRTitle(''); setRDesc(''); setRCalories(''); setRProteins('');
    setRFat(''); setRCarbs(''); setRDirections(''); setRIngredients(''); setRCategory('custom');
  };

  const deleteRecipe = async (id: string) => {
    try {
      await api.delete(`/v1/receipes/${id}`);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (e) { console.error(e); }
  };

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditAddress(user?.address || '');
    setEditDob(user?.date_of_birth || '');
    setShowEditProfile(true);
  };

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <LinearGradient colors={['#26B50F', '#1E8F0C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.profileHeader}>
            <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={showPhotoOptions} activeOpacity={0.8} style={st.avatarWrap}>
              {user?.avatar_url || user?.profile_image ? (
                <Image source={{ uri: user.avatar_url || user.profile_image }} style={st.avatarLarge} contentFit="cover" transition={200} />
              ) : (
                <View style={st.avatarLargeInitial}><Text style={st.avatarLargeText}>{user?.name?.[0] || 'U'}</Text></View>
              )}
              <View style={st.cameraOverlay}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={st.profileName}>{user?.name || 'User'}</Text>
            <Text style={st.profileEmail}>{user?.email}</Text>
            <View style={st.subBadge}>
              <Ionicons name={user?.subscription === 'pro' ? 'diamond' : 'sparkles'} size={14} color={user?.subscription === 'pro' ? Colors.lime : '#FFF'} />
              <Text style={st.subBadgeText}>{user?.subscription === 'pro' ? 'BO Pro' : 'Free Plan'}</Text>
            </View>
            <TouchableOpacity style={st.editBtn} onPress={openEditProfile}>
              <Ionicons name="create-outline" size={16} color="#FFF" />
              <Text style={st.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={st.statsRow}>
          {[
            { num: dashboard?.meals_logged || 0, label: 'Meals', color: Colors.nutritionOrange, bg: Colors.nutritionSurface },
            { num: Math.round(dashboard?.calories || 0), label: 'Fuel', color: Colors.green, bg: Colors.greenLight },
            { num: earnedCount, label: 'Badges', color: Colors.fitnessPurple, bg: Colors.fitnessSurface },
          ].map((s, i) => (
            <View key={i} style={[st.statBox, { backgroundColor: s.bg }, Shadow.sm]}>
              <Text style={[st.statNum, { color: s.color }]}>{s.num}</Text>
              <Text style={st.statSub}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Badges Section */}
        <Animated.View entering={FadeInDown.delay(150).duration(350)} style={st.section}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionTitle}>Badges</Text>
            <Text style={st.sectionCount}>{earnedCount}/{badges.length} earned</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {badges.map((badge, i) => {
              const cat = BADGE_COLORS[badge.category] || BADGE_COLORS.wellness;
              return (
                <View key={badge.id || i} style={[st.badgeCard, { backgroundColor: badge.earned ? cat.bg : '#F5F5F5' }, badge.earned && Shadow.sm]}>
                  <View style={[st.badgeIcon, { backgroundColor: badge.earned ? cat.color : '#DDD' }]}>
                    <Ionicons name={(badge.icon || 'star-outline') as any} size={20} color="#FFF" />
                  </View>
                  <Text style={[st.badgeName, !badge.earned && { color: Colors.textTertiary }]} numberOfLines={2}>{badge.name}</Text>
                  {badge.earned ? (
                    <Ionicons name="checkmark-circle" size={16} color={cat.color} />
                  ) : (
                    <Ionicons name="lock-closed-outline" size={14} color={Colors.textTertiary} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Meal Planter Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)} style={st.section}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionTitle}>Meal Planter</Text>
            <TouchableOpacity onPress={() => setShowCreateRecipe(true)}>
              <View style={st.addRecipeBtn}>
                <Ionicons name="add" size={16} color={Colors.green} />
                <Text style={st.addRecipeText}>Create</Text>
              </View>
            </TouchableOpacity>
          </View>
          {recipes.length === 0 ? (
            <View style={st.emptyRecipes}>
              <Ionicons name="book-outline" size={36} color={Colors.textTertiary} />
              <Text style={st.emptyRecipesText}>No meal planter entries yet</Text>
              <TouchableOpacity onPress={() => setShowCreateRecipe(true)}>
                <Text style={st.createRecipeLink}>Create your first meal planter entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recipes.map((recipe, i) => (
              <TouchableOpacity key={recipe.id} style={[st.recipeCard, Shadow.sm]} onPress={() => router.push(`/recipe-detail?id=${recipe.id}` as any)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={st.recipeTitle}>{recipe.title}</Text>
                  <Text style={st.recipeMeta}>
                    {recipe.calories} fuel · {recipe.category}
                    {recipe.ingredients?.length ? ` · ${recipe.ingredients.length} ingredients` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); deleteRecipe(recipe.id); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>

        {/* Personal Details */}
        <Animated.View entering={FadeInDown.delay(250).duration(350)} style={st.section}>
          <Text style={st.sectionTitle}>Personal Details</Text>
          <View style={[st.detailsCard, Shadow.sm]}>
            {[
              { icon: 'mail-outline', label: 'Email', value: user?.email, color: Colors.waterBlue },
              { icon: 'call-outline', label: 'Phone', value: user?.phone || 'Not set', color: Colors.green },
              { icon: 'location-outline', label: 'Address', value: user?.address || 'Not set', color: Colors.nutritionOrange },
              { icon: 'calendar-outline', label: 'Date of Birth', value: user?.date_of_birth || 'Not set', color: Colors.fitnessPurple },
            ].map((item, i) => (
              <View key={i} style={[st.detailRow, i < 3 && st.detailBorder]}>
                <View style={[st.detailIcon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.detailLabel}>{item.label}</Text>
                  <Text style={st.detailValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Goals & Diet */}
        {(user?.goals || []).length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(350)} style={st.section}>
            <Text style={st.sectionTitle}>My Goals</Text>
            <View style={st.chipRow}>
              {(user?.goals || []).map((g: string) => (
                <LinearGradient key={g} colors={[Colors.lime + '30', Colors.greenLight]} style={st.goalChip}>
                  <Text style={st.goalChipText}>{g.replace(/_/g, ' ')}</Text>
                </LinearGradient>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(350).duration(350)} style={[st.settingsCard, Shadow.sm]}>
          <Text style={st.sectionTitle}>Settings</Text>
          {[
            { icon: 'settings-outline', label: 'Settings', color: Colors.textSecondary, bg: '#F3F4F6' },
            { icon: 'diamond-outline', label: 'Subscription', color: Colors.green, bg: Colors.greenLight },
            { icon: 'lock-closed-outline', label: 'Change Password', color: '#FF5252', bg: '#FFF0F0' },
            { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.socialTeal, bg: Colors.socialSurface },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={st.menuItem} onPress={() => {
              if (item.label === 'Change Password') { setShowChangePw(true); setPwError(''); setPwSuccess(''); setCurPw(''); setNewPw(''); setConfirmPw(''); }
              else if (item.label === 'Subscription') { router.push('/subscription' as any); }
              else if (item.label === 'Settings') { router.push('/settings' as any); }
              else if (item.label === 'Help & Support') { router.push('/help' as any); }
            }} activeOpacity={0.7}>
              <View style={st.menuLeft}>
                <View style={[st.menuIconWrap, { backgroundColor: item.bg }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
                <Text style={st.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Logout */}
        <TouchableOpacity style={st.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={st.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===== CHANGE PASSWORD MODAL ===== */}
      <Modal visible={showChangePw} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, Shadow.lg]}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePw(false)}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            {pwError ? <View style={st.errBox}><Text style={st.errText}>{pwError}</Text></View> : null}
            {pwSuccess ? <View style={st.succBox}><Text style={st.succText}>{pwSuccess}</Text></View> : null}
            <Text style={st.inputLabel}>Current Password</Text>
            <TextInput style={st.input} value={curPw} onChangeText={setCurPw} secureTextEntry placeholder="Enter current password" placeholderTextColor={Colors.textTertiary} />
            <Text style={st.inputLabel}>New Password</Text>
            <TextInput style={st.input} value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="Min 8 characters" placeholderTextColor={Colors.textTertiary} />
            <Text style={st.inputLabel}>Confirm New Password</Text>
            <TextInput style={st.input} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry placeholder="Confirm new password" placeholderTextColor={Colors.textTertiary} />
            <TouchableOpacity onPress={handleChangePw} disabled={pwLoading} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.modalBtn}><Text style={st.modalBtnText}>{pwLoading ? 'Changing...' : 'Change Password'}</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== EDIT PROFILE MODAL ===== */}
      <Modal visible={showEditProfile} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.modalOverlay}>
            <View style={[st.modalContent, Shadow.lg]}>
              <View style={st.modalHeader}>
                <Text style={st.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setShowEditProfile(false)}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={st.inputLabel}>Full Name</Text>
                <TextInput style={st.input} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={Colors.textTertiary} />
                <Text style={st.inputLabel}>Phone</Text>
                <TextInput style={st.input} value={editPhone} onChangeText={setEditPhone} placeholder="Phone number" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" />
                <Text style={st.inputLabel}>Address</Text>
                <TextInput style={st.input} value={editAddress} onChangeText={setEditAddress} placeholder="Your address" placeholderTextColor={Colors.textTertiary} />
                <Text style={st.inputLabel}>Date of Birth</Text>
                <TextInput style={st.input} value={editDob} onChangeText={setEditDob} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} />
                <TouchableOpacity onPress={handleEditProfile} disabled={editLoading} activeOpacity={0.8}>
                  <LinearGradient colors={[Colors.green, Colors.greenDark]} style={st.modalBtn}><Text style={st.modalBtnText}>{editLoading ? 'Saving...' : 'Save Changes'}</Text></LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== CREATE RECIPE MODAL ===== */}
      <Modal visible={showCreateRecipe} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={st.createHeader}>
              <TouchableOpacity onPress={() => { setShowCreateRecipe(false); resetRecipeForm(); }}>
                <Text style={st.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={st.createTitle}>New Meal Planter Entry</Text>
              <TouchableOpacity onPress={handleCreateRecipe} disabled={creatingRecipe}>
                <View style={[st.saveBtn, (!rTitle.trim() || !rIngredients.trim()) && { opacity: 0.5 }]}>
                  {creatingRecipe ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={st.saveBtnText}>Save</Text>}
                </View>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <Text style={st.inputLabel}>Title *</Text>
              <TextInput style={st.input} value={rTitle} onChangeText={setRTitle} placeholder="Recipe name" placeholderTextColor={Colors.textTertiary} />

              <Text style={st.inputLabel}>Description</Text>
              <TextInput style={[st.input, { minHeight: 60 }]} value={rDesc} onChangeText={setRDesc} placeholder="Brief description" placeholderTextColor={Colors.textTertiary} multiline />

              <Text style={st.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                {['custom', 'Healthy', 'Vegan', 'Keto', 'Mediterranean', 'High Protein', 'Balanced'].map(c => (
                  <TouchableOpacity key={c} style={[st.catChip, rCategory === c && st.catChipActive]} onPress={() => setRCategory(c)}>
                    <Text style={[st.catChipText, rCategory === c && st.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={st.macroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={st.inputLabel}>Fuel</Text>
                  <TextInput style={st.input} value={rCalories} onChangeText={setRCalories} placeholder="0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.inputLabel}>Protein (g)</Text>
                  <TextInput style={st.input} value={rProteins} onChangeText={setRProteins} placeholder="0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
                </View>
              </View>
              <View style={st.macroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={st.inputLabel}>Fat (g)</Text>
                  <TextInput style={st.input} value={rFat} onChangeText={setRFat} placeholder="0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.inputLabel}>Carbs (g)</Text>
                  <TextInput style={st.input} value={rCarbs} onChangeText={setRCarbs} placeholder="0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
                </View>
              </View>

              <Text style={st.inputLabel}>Ingredients * (one per line, name - quantity)</Text>
              <TextInput
                style={[st.input, { minHeight: 100, textAlignVertical: 'top' }]}
                value={rIngredients}
                onChangeText={setRIngredients}
                placeholder={"Chicken breast - 200g\nOlive oil - 1 tbsp\nSalt - to taste"}
                placeholderTextColor={Colors.textTertiary}
                multiline
              />

              <Text style={st.inputLabel}>Directions</Text>
              <TextInput
                style={[st.input, { minHeight: 100, textAlignVertical: 'top' }]}
                value={rDirections}
                onChangeText={setRDirections}
                placeholder={"1. Preheat oven to 375F\n2. Season chicken\n3. Bake for 25 minutes"}
                placeholderTextColor={Colors.textTertiary}
                multiline
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { paddingBottom: 100 },
  profileHeader: { borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, padding: Spacing.xl, paddingTop: Spacing.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', top: Spacing.md, left: Spacing.md, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarLargeInitial: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarLargeText: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  profileName: { color: '#FFF', fontSize: FontSize.h2, fontWeight: '800' },
  profileEmail: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, marginTop: 2 },
  subBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.pill },
  subBadgeText: { color: '#FFF', fontSize: FontSize.caption, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill },
  editBtnText: { color: '#FFF', fontSize: FontSize.small, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: -20, paddingHorizontal: Spacing.md },
  statBox: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  statNum: { fontSize: FontSize.h3, fontWeight: '800' },
  statSub: { color: Colors.textTertiary, fontSize: FontSize.caption, marginTop: 2 },

  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.h4, fontWeight: '700', marginBottom: Spacing.sm },
  sectionCount: { fontSize: FontSize.caption, color: Colors.textTertiary, fontWeight: '600' },

  // Badges
  badgeCard: { width: 100, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', gap: 6 },
  badgeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', lineHeight: 14 },

  // Recipes
  addRecipeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.greenLight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.pill },
  addRecipeText: { fontSize: FontSize.small, color: Colors.green, fontWeight: '700' },
  emptyRecipes: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyRecipesText: { fontSize: FontSize.body, color: Colors.textTertiary },
  createRecipeLink: { fontSize: FontSize.small, color: Colors.green, fontWeight: '700' },
  recipeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  recipeTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.textPrimary },
  recipeMeta: { fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 },

  // Personal Details
  detailsCard: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: FontSize.caption, color: Colors.textTertiary, fontWeight: '600' },
  detailValue: { fontSize: FontSize.body, color: Colors.textPrimary, marginTop: 1 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  goalChip: { borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: Spacing.md },
  goalChipText: { color: Colors.green, fontSize: FontSize.caption, fontWeight: '700', textTransform: 'capitalize' },

  settingsCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, margin: Spacing.md, marginTop: Spacing.lg, padding: Spacing.md },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: '500' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, marginTop: Spacing.sm },
  logoutText: { color: Colors.danger, fontSize: FontSize.body, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.bgBase, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary },
  errBox: { backgroundColor: '#FFF0F0', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  errText: { color: Colors.danger, fontSize: FontSize.small, textAlign: 'center' },
  succBox: { backgroundColor: Colors.greenLight, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  succText: { color: Colors.green, fontSize: FontSize.small, textAlign: 'center', fontWeight: '700' },
  inputLabel: { color: Colors.textSecondary, fontSize: FontSize.caption, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.md, textTransform: 'uppercase' as const, letterSpacing: 1 },
  input: { backgroundColor: '#F5F5F5', borderRadius: Radius.lg, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.body },
  modalBtn: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.xl },
  modalBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },

  // Create recipe modal
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  cancelText: { color: Colors.textSecondary, fontSize: FontSize.body, fontWeight: '600' },
  createTitle: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: { backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 20 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  macroRow: { flexDirection: 'row', gap: Spacing.md },
  catChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, backgroundColor: '#F5F5F5', marginRight: Spacing.sm },
  catChipActive: { backgroundColor: Colors.green },
  catChipText: { fontSize: FontSize.small, fontWeight: '600', color: Colors.textSecondary },
  catChipTextActive: { color: '#FFF' },
});
