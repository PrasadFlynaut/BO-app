import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/src/theme';
import api from '@/src/api';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/v1/subscription/plans'),
        api.get('/v1/subscription'),
      ]);
      setPlans(plansRes.data.plans || []);
      setCurrentSub(subRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId);
    try {
      // Create Stripe checkout session
      const { data } = await api.post('/v1/payment/create-checkout', {
        plan_id: planId,
        success_url: 'https://bo-wellness.app/success',
        cancel_url: 'https://bo-wellness.app/cancel',
      });
      if (data.url) {
        // Open Stripe checkout in browser
        await Linking.openURL(data.url);
        Alert.alert(
          'Complete Payment',
          'A payment page has been opened in your browser. Once completed, return here and tap "Verify Payment".',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Payment', onPress: async () => {
              try {
                const result = await api.post('/v1/payment/confirm', { session_id: data.sessionId });
                if (result.data.status === 'confirmed') {
                  Alert.alert('Welcome to BO Pro!', 'Payment confirmed. You now have access to all premium features.');
                  await loadData();
                } else {
                  Alert.alert('Pending', 'Payment is still processing. Please try verifying again in a moment.');
                }
              } catch (e: any) {
                Alert.alert('Error', e.response?.data?.detail || 'Verification failed');
              }
            }},
          ]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Payment setup failed');
    }
    setPurchasing(null);
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Subscription?', 'You will retain access until the end of your current billing period.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Subscription', style: 'destructive', onPress: async () => {
        try {
          await api.put('/v1/subscription/cancel');
          Alert.alert('Cancelled', 'Your subscription will end at the current period.');
          await loadData();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Cancel failed'); }
      }},
    ]);
  };

  const isPro = currentSub?.plan && currentSub.plan !== 'basic';

  if (loading) return (
    <SafeAreaView style={ss.safe}>
      <View style={ss.loadWrap}><ActivityIndicator size="large" color={Colors.green} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={ss.safe} edges={['top']}>
      <Animated.View entering={FadeIn.duration(300)} style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <LinearGradient
            colors={isPro ? ['#26B50F', '#1E8F0C'] : ['#E0E0E0', '#BDBDBD']}
            style={ss.statusCard}
          >
            <Ionicons name={isPro ? 'diamond' : 'sparkles'} size={32} color="#FFF" />
            <Text style={ss.statusPlan}>{isPro ? 'BO Pro' : 'Basic Plan'}</Text>
            <Text style={ss.statusDesc}>{isPro ? 'You have full access to all features' : 'Upgrade to unlock premium features'}</Text>
            {isPro && currentSub?.expiresAt && (
              <Text style={ss.statusExpiry}>Renews: {new Date(currentSub.expiresAt).toLocaleDateString()}</Text>
            )}
            {currentSub?.status === 'cancelling' && (
              <View style={ss.cancelBadge}><Text style={ss.cancelBadgeText}>Cancels at period end</Text></View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Plans */}
        <Text style={ss.sectionTitle}>Choose Your Plan</Text>
        {plans.map((plan, index) => {
          const isBasic = plan.name === 'basic';
          const isPopular = plan.name === 'pro_annual';
          const isCurrent = (isPro && plan.name !== 'basic') || (!isPro && isBasic);
          const price = plan.price_cents ? `$${(plan.price_cents / 100).toFixed(2)}` : 'Free';
          const period = plan.billing_period === 'monthly' ? '/mo' : plan.billing_period === 'annual' ? '/yr' : '';

          return (
            <Animated.View key={plan.id} entering={FadeInDown.delay(100 + index * 80).duration(350)}>
              <View style={[ss.planCard, isPopular && ss.planCardPopular, Shadow.sm]}>
                {isPopular && (
                  <View style={ss.popularBadge}><Text style={ss.popularBadgeText}>Best Value</Text></View>
                )}
                <View style={ss.planHeader}>
                  <View>
                    <Text style={ss.planName}>{plan.display_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Text style={ss.planPrice}>{price}</Text>
                      {period ? <Text style={ss.planPeriod}>{period}</Text> : null}
                    </View>
                  </View>
                  {isCurrent && <View style={ss.currentBadge}><Ionicons name="checkmark-circle" size={16} color={Colors.green} /><Text style={ss.currentBadgeText}>Current</Text></View>}
                </View>

                <View style={ss.featureList}>
                  {(plan.features || []).map((f: string, fi: number) => (
                    <View key={fi} style={ss.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={isBasic ? Colors.textTertiary : Colors.green} />
                      <Text style={ss.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {!isBasic && !isCurrent && (
                  <TouchableOpacity onPress={() => handlePurchase(plan.id)} disabled={!!purchasing} activeOpacity={0.8}>
                    <LinearGradient colors={[Colors.green, Colors.greenDark]} style={ss.purchaseBtn}>
                      {purchasing === plan.id ? <ActivityIndicator color="#FFF" /> : <Text style={ss.purchaseBtnText}>Upgrade to Pro</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {isPro && !isBasic && isCurrent && currentSub?.status !== 'cancelling' && (
                  <TouchableOpacity style={ss.cancelBtn} onPress={handleCancel}>
                    <Text style={ss.cancelBtnText}>Cancel Subscription</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          );
        })}

        {/* Disclaimer */}
        <Text style={ss.disclaimer}>Payment is simulated for demo purposes. In production, this would use Apple/Google In-App Purchases.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF9' },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statusCard: { borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.xl },
  statusPlan: { fontSize: FontSize.h2, fontWeight: '800', color: '#FFF', marginTop: Spacing.sm },
  statusDesc: { fontSize: FontSize.body, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statusExpiry: { fontSize: FontSize.caption, color: 'rgba(255,255,255,0.6)', marginTop: Spacing.sm },
  cancelBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 12, marginTop: Spacing.sm },
  cancelBadgeText: { color: '#FFF', fontSize: FontSize.caption, fontWeight: '700' },
  sectionTitle: { fontSize: FontSize.h3, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  planCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.borderLight },
  planCardPopular: { borderColor: Colors.green, borderWidth: 2 },
  popularBadge: { position: 'absolute', top: -10, right: Spacing.lg, backgroundColor: Colors.green, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 12 },
  popularBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  planName: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary },
  planPrice: { fontSize: 28, fontWeight: '800', color: Colors.green },
  planPeriod: { fontSize: FontSize.body, color: Colors.textTertiary },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.greenLight, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  currentBadgeText: { fontSize: FontSize.caption, color: Colors.green, fontWeight: '700' },
  featureList: { gap: 8, marginBottom: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureText: { fontSize: FontSize.small, color: Colors.textSecondary, flex: 1 },
  purchaseBtn: { borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  purchaseBtnText: { color: '#FFF', fontSize: FontSize.body, fontWeight: '700' },
  cancelBtn: { borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.danger },
  cancelBtnText: { color: Colors.danger, fontSize: FontSize.body, fontWeight: '600' },
  disclaimer: { fontSize: FontSize.caption, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 18 },
});
