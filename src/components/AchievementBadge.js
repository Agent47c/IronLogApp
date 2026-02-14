import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';

/**
 * Achievement Badge Component
 * Displays unlocked achievements and milestones
 * 
 * @param {string} type - Achievement type: 'streak', 'volume', 'workouts', 'pr'
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {boolean} unlocked - Whether badge is unlocked
 * @param {string} icon - Icon name from Ionicons
 */
const AchievementBadge = ({
  type = 'streak',
  title = 'Achievement',
  description = '',
  unlocked = false,
  icon = 'trophy',
  variant = 'full', // 'full' or 'compact'
}) => {
  const getBadgeColor = () => {
    if (!unlocked) return COLORS.disabled;
    
    switch (type) {
      case 'streak':
        return COLORS.primary;
      case 'volume':
        return COLORS.accent;
      case 'workouts':
        return COLORS.success;
      case 'pr':
        return COLORS.warning;
      default:
        return COLORS.primary;
    }
  };

  const getBadgeIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'streak':
        return 'flame';
      case 'volume':
        return 'barbell';
      case 'workouts':
        return 'checkmark-circle';
      case 'pr':
        return 'trophy';
      default:
        return 'star';
    }
  };

  const badgeColor = getBadgeColor();
  const badgeIcon = getBadgeIcon();

  if (variant === 'compact') {
    return (
      <View style={[
        styles.compactContainer,
        { backgroundColor: unlocked ? badgeColor + '20' : COLORS.surface }
      ]}>
        <Ionicons 
          name={badgeIcon} 
          size={20} 
          color={badgeColor} 
        />
        <Text style={[styles.compactTitle, { color: unlocked ? COLORS.text : COLORS.textTertiary }]}>
          {title}
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      !unlocked && styles.containerLocked,
    ]}>
      {/* Badge Icon */}
      <View style={[
        styles.iconContainer,
        { backgroundColor: unlocked ? badgeColor : COLORS.disabled },
        unlocked && styles.iconContainerUnlocked,
      ]}>
        <Ionicons 
          name={badgeIcon} 
          size={32} 
          color={unlocked ? COLORS.background : COLORS.textTertiary} 
        />
        {unlocked && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          </View>
        )}
      </View>

      {/* Badge Info */}
      <View style={styles.textContainer}>
        <Text style={[
          styles.title,
          !unlocked && styles.titleLocked
        ]}>
          {title}
        </Text>
        {description && (
          <Text style={[
            styles.description,
            !unlocked && styles.descriptionLocked
          ]}>
            {description}
          </Text>
        )}
      </View>

      {/* Lock indicator */}
      {!unlocked && (
        <View style={styles.lockContainer}>
          <Ionicons name="lock-closed" size={16} color={COLORS.textTertiary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Full variant
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  containerLocked: {
    opacity: 0.5,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    position: 'relative',
  },
  iconContainerUnlocked: {
    ...SHADOWS.neonGold,
  },
  checkmark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.circle,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  titleLocked: {
    color: COLORS.textTertiary,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  descriptionLocked: {
    color: COLORS.textTertiary,
  },
  lockContainer: {
    marginLeft: SPACING.sm,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    gap: SPACING.xs,
  },
  compactTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default AchievementBadge;

// Predefined achievement configurations
export const ACHIEVEMENTS = {
  // Streak achievements
  FIRST_WORKOUT: {
    type: 'streak',
    title: 'First Step',
    description: 'Complete your first workout',
    icon: 'rocket',
  },
  WEEK_STREAK: {
    type: 'streak',
    title: 'Week Warrior',
    description: '7 day workout streak',
    icon: 'flame',
  },
  MONTH_STREAK: {
    type: 'streak',
    title: 'Iron Dedication',
    description: '30 day workout streak',
    icon: 'flame',
  },
  
  // Volume achievements
  TON_LIFTED: {
    type: 'volume',
    title: 'Ton Lifter',
    description: 'Lift 1,000 kg total',
    icon: 'barbell',
  },
  HEAVY_HITTER: {
    type: 'volume',
    title: 'Heavy Hitter',
    description: 'Lift 10,000 kg total',
    icon: 'barbell',
  },
  
  // Workout count achievements
  TEN_WORKOUTS: {
    type: 'workouts',
    title: 'Getting Started',
    description: 'Complete 10 workouts',
    icon: 'fitness',
  },
  FIFTY_WORKOUTS: {
    type: 'workouts',
    title: 'Gym Regular',
    description: 'Complete 50 workouts',
    icon: 'star',
  },
  HUNDRED_WORKOUTS: {
    type: 'workouts',
    title: 'Century Club',
    description: 'Complete 100 workouts',
    icon: 'trophy',
  },
  
  // PR achievements
  FIRST_PR: {
    type: 'pr',
    title: 'Personal Best',
    description: 'Set your first PR',
    icon: 'medal',
  },
  PR_MASTER: {
    type: 'pr',
    title: 'PR Master',
    description: 'Set 10 personal records',
    icon: 'trophy',
  },
};
