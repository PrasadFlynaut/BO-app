import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, Radius } from '@/src/theme';

interface ProgramModalProps {
  visible: boolean;
  program: any;
  enrolling: boolean;
  onClose: () => void;
  onEnroll: () => void;
}

export default function ProgramModal({ visible, program, enrolling, onClose, onEnroll }: ProgramModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.sheet}>
              <View style={styles.handle} />
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {program && (
                  <>
                    <Image source={{ uri: program.image_url }} style={styles.image} />
                    <View style={styles.body}>
                      <View style={styles.badge}>
                        <Ionicons name="time-outline" size={14} color={Colors.green} />
                        <Text style={styles.badgeText}>{program.duration_days} Days Program</Text>
                      </View>
                      <Text style={styles.title}>{program.name}</Text>
                      <Text style={styles.desc}>{program.description}</Text>

                      <Text style={styles.section}>What's Included</Text>
                      <View style={styles.featureList}>
                        {['Daily guided activities', 'Progress tracking', 'Check-in reminders', 'Completion certificate'].map((f, i) => (
                          <View key={i} style={styles.feature}>
                            <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                            <Text style={styles.featureText}>{f}</Text>
                          </View>
                        ))}
                      </View>

                      <TouchableOpacity
                        onPress={onEnroll}
                        style={styles.enrollBtn}
                        activeOpacity={0.8}
                        disabled={enrolling}
                      >
                        {enrolling ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Ionicons name="rocket" size={20} color="#FFF" />
                            <Text style={styles.enrollBtnText}>Start Program</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>Maybe Later</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  image: { width: '100%', height: 200, marginTop: 8 },
  body: { padding: Spacing.lg },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.greenLight, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 10 },
  badgeText: { fontSize: FontSize.small, color: Colors.green, fontWeight: '600' },
  title: { fontSize: FontSize.h2, fontWeight: '800', color: Colors.textPrimary },
  desc: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 22, marginTop: 10 },
  section: { fontSize: FontSize.h4, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  featureList: { gap: 10 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: FontSize.body, color: Colors.textSecondary },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.green, borderRadius: Radius.lg, paddingVertical: 16, marginTop: Spacing.lg },
  enrollBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.body },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { color: Colors.textTertiary, fontSize: FontSize.body },
});
