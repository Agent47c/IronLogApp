import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, commonStyles } from '../utils/theme';
import { ProfileService, AnalyticsService } from '../services/profileService';
import { showAlert } from '../components/CustomAlertDialog';
import GlowingButton from '../components/GlowingButton';
import SkeletonLoader from '../components/SkeletonLoader';
import { AuthContext } from '../components/AuthGuard'; // Added import for AuthContext

const FITNESS_GOALS = [
  'Lose Weight',
  'Build Muscle',
  'Improve Endurance',
  'Increase Strength',
  'General Fitness',
  'Tone Up'
];

const EXPERIENCE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Athlete'
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    total_workouts: 0,
    total_duration_minutes: 0,
    unique_exercises: 0,
    total_volume: 0,
    this_month_workouts: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Selection Modal State
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState(null); // 'goal' or 'experience'

  // Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    fitnessGoal: '',
    experienceLevel: '',
    profileImage: null
  });

  const loadData = useCallback(async () => {
    try {
      const [profileData, statsData] = await Promise.all([
        ProfileService.getProfile(),
        AnalyticsService.getStatsSummary()
      ]);

      setProfile(profileData);
      setStats(statsData);

      if (profileData) {
        setFormData({
          name: profileData.name || '',
          age: profileData.age ? profileData.age.toString() : '',
          weight: profileData.weight ? profileData.weight.toString() : '',
          height: profileData.height ? profileData.height.toString() : '',
          fitnessGoal: profileData.fitness_goal || '',
          experienceLevel: profileData.experience_level || '',
          profileImage: profileData.profile_image || null
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to load profile data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const { setIgnoreBackground } = React.useContext(AuthContext);

  const handlePickImage = async () => {
    try {
      setIgnoreBackground(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setFormData({ ...formData, profileImage: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to pick image' });
    } finally {
      setTimeout(() => {
        setIgnoreBackground(false);
      }, 1000);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!formData.name.trim()) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Name is required' });
        return;
      }

      await ProfileService.saveProfile(
        formData.name,
        formData.age ? parseInt(formData.age) : null,
        formData.weight ? parseFloat(formData.weight) : null,
        formData.height ? parseFloat(formData.height) : null,
        formData.fitnessGoal,
        formData.experienceLevel,
        formData.profileImage
      );

      setIsEditing(false);
      loadData();
      showAlert({ type: 'success', title: 'Success', message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error saving profile:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to save profile' });
    }
  };

  const openSelectionModal = (type) => {
    setSelectionType(type);
    setSelectionModalVisible(true);
  };

  const handeSelection = (value) => {
    if (selectionType === 'goal') {
      setFormData({ ...formData, fitnessGoal: value });
    } else {
      setFormData({ ...formData, experienceLevel: value });
    }
    setSelectionModalVisible(false);
  };

  const renderStatCard = (icon, label, value, subLabel = '') => (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {!!subLabel && <Text style={styles.statSubLabel}>{subLabel}</Text>}
    </View>
  );

  // Import SkeletonLoader if not already imported (it is not in the original file, so I will add the import in a separate step or ensure it's available)

  if (loading && !refreshing) {
    return (
      <View style={commonStyles.container}>
        <View style={styles.scrollContent}>
          {/* Header Skeleton */}
          <View style={[styles.header, { marginBottom: SPACING.xl }]}>
            <SkeletonLoader width={150} height={32} />
            <SkeletonLoader width={40} height={40} borderRadius={20} />
          </View>

          {/* Profile Card Skeleton */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <SkeletonLoader width={70} height={70} borderRadius={35} style={{ marginRight: SPACING.md }} />
              <View style={{ flex: 1 }}>
                <SkeletonLoader width={120} height={24} style={{ marginBottom: SPACING.sm }} />
                <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
                  <SkeletonLoader width={60} height={20} />
                  <SkeletonLoader width={80} height={20} />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.physicalStatsRow}>
              <SkeletonLoader width={60} height={40} />
              <View style={styles.verticalDivider} />
              <SkeletonLoader width={60} height={40} />
              <View style={styles.verticalDivider} />
              <SkeletonLoader width={40} height={40} />
            </View>
          </View>

          {/* Stats Grid Skeleton */}
          <SkeletonLoader width={150} height={24} style={{ marginBottom: SPACING.md }} />
          <View style={styles.statsGrid}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={styles.statCard}>
                <SkeletonLoader width={32} height={32} style={{ marginBottom: SPACING.sm }} />
                <SkeletonLoader width={60} height={28} style={{ marginBottom: 2 }} />
                <SkeletonLoader width={40} height={14} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              style={styles.avatar}
              onPress={isEditing ? handlePickImage : null}
              disabled={!isEditing}
            >
              {profile?.profile_image ? (
                <Image source={{ uri: profile.profile_image }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : 'G'}
                </Text>
              )}
              {isEditing && (
                <View style={styles.editAvatarOverlay}>
                  <Ionicons name="camera" size={20} color={COLORS.text} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name || 'Guest User'}</Text>
              <View style={styles.badgeContainer}>
                {!!profile?.fitness_goal && (
                  <View style={[styles.badge, styles.goalBadge]}>
                    <Text style={styles.badgeText}>{profile.fitness_goal}</Text>
                  </View>
                )}
                {!!profile?.experience_level && (
                  <View style={[styles.badge, styles.expBadge]}>
                    <Text style={styles.badgeText}>{profile.experience_level}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.physicalStatsRow}>
            <View style={styles.physicalStatItem}>
              <Text style={styles.physicalStatLabel}>Weight</Text>
              <Text style={styles.physicalStatValue}>{profile?.weight || '--'} kg</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.physicalStatItem}>
              <Text style={styles.physicalStatLabel}>Height</Text>
              <Text style={styles.physicalStatValue}>{profile?.height || '--'} cm</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.physicalStatItem}>
              <Text style={styles.physicalStatLabel}>Age</Text>
              <Text style={styles.physicalStatValue}>{profile?.age || '--'} yrs</Text>
            </View>
          </View>
        </View>

        {/* Stats Overview */}
        <Text style={styles.sectionTitle}>Activity Overview</Text>

        <View style={styles.statsGrid}>
          {renderStatCard('dumbbell', 'Workouts', stats.total_workouts, 'Total Sessions')}
          {renderStatCard('clock-outline', 'Time', `${Math.round(stats.total_duration_minutes / 60)}h`, `${stats.total_duration_minutes % 60}m`)}
          {renderStatCard('weight', 'Volume', `${(stats.total_volume / 1000).toFixed(1)}k`, 'Total Kg')}
          {renderStatCard('calendar-check', 'This Month', stats.this_month_workouts, 'Sessions')}
        </View>

        {/* Placeholder for future charts or detailed stats */}
        <View style={styles.card}>
          <View style={commonStyles.rowBetween}>
            <Text style={styles.cardTitle}>Coming Soon</Text>
            <Ionicons name="stats-chart" size={20} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.cardText}>Detailed progress charts and heatmaps will be available in the next update.</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Avatar Picker in Form */}
              <View style={styles.formAvatarContainer}>
                <TouchableOpacity onPress={handlePickImage} style={styles.formAvatar}>
                  {formData.profileImage ? (
                    <Image source={{ uri: formData.profileImage }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.formAvatarLabel}>Tap to change photo</Text>
              </View>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textTertiary}
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.weight}
                    onChangeText={(text) => setFormData({ ...formData, weight: text })}
                    keyboardType="numeric"
                    placeholder="0.0"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.height}
                    onChangeText={(text) => setFormData({ ...formData, height: text })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={formData.age}
                onChangeText={(text) => setFormData({ ...formData, age: text })}
                keyboardType="numeric"
                placeholder="Age"
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.inputLabel}>Fitness Goal</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => openSelectionModal('goal')}
              >
                <Text style={{ color: formData.fitnessGoal ? COLORS.text : COLORS.textTertiary }}>
                  {formData.fitnessGoal || 'Select Goal'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} style={{ position: 'absolute', right: 12, top: 12 }} />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Experience Level</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => openSelectionModal('experience')}
              >
                <Text style={{ color: formData.experienceLevel ? COLORS.text : COLORS.textTertiary }}>
                  {formData.experienceLevel || 'Select Experience'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} style={{ position: 'absolute', right: 12, top: 12 }} />
              </TouchableOpacity>

              <GlowingButton onPress={handleSaveProfile} glowColor={COLORS.primary}>
                Save Profile
              </GlowingButton>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Selection Modal (Dropdown replacement) */}
      <Modal
        visible={selectionModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.selectionModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectionModalVisible(false)}
        >
          <View style={styles.selectionModalContent}>
            <Text style={styles.selectionModalTitle}>
              Select {selectionType === 'goal' ? 'Fitness Goal' : 'Experience Level'}
            </Text>

            {(selectionType === 'goal' ? FITNESS_GOALS : EXPERIENCE_LEVELS).map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.selectionItem}
                onPress={() => handeSelection(item)}
              >
                <Text style={[
                  styles.selectionItemText,
                  (selectionType === 'goal' ? formData.fitnessGoal : formData.experienceLevel) === item && styles.selectedItemText
                ]}>
                  {item}
                </Text>
                {(selectionType === 'goal' ? formData.fitnessGoal : formData.experienceLevel) === item && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.md : SPACING.lg,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  screenTitle: {
    fontSize: FONT_SIZES.huge,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  editButton: {
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.circle,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.circle,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  goalBadge: {
    backgroundColor: 'rgba(34, 230, 255, 0.15)',
  },
  expBadge: {
    backgroundColor: 'rgba(255, 120, 73, 0.15)',
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  physicalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  physicalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    height: '100%',
  },
  physicalStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  physicalStatValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  statIconContainer: {
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 120, 73, 0.1)',
    padding: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  statSubLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  cardText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    height: '85%',
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  formContainer: {
    flex: 1,
  },
  formAvatarContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  formAvatar: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.circle,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
  },
  formAvatarLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    justifyContent: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },

  // Selection Modal
  selectionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  selectionModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '70%',
  },
  selectionModalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  selectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  selectionItemText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  selectedItemText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
});