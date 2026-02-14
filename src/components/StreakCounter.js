import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS } from '../utils/theme';

/**
 * Workout Streak Counter Component
 * Shows current workout streak with fire emoji
 * 
 * @param {number} streak - Current streak count
 * @param {string} variant - 'compact' or 'full' (default: 'full')
 */
const StreakCounter = ({ streak = 0, variant = 'full' }) => {
  const getStreakColor = () => {
    if (streak === 0) return COLORS.disabled;
    if (streak < 3) return COLORS.textSecondary;
    if (streak < 7) return COLORS.warning;
    if (streak < 14) return COLORS.accent;
    return COLORS.primary; // 14+ days is fire!
  };

  const getStreakMessage = () => {
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return 'Good start!';
    if (streak < 3) return 'Keep going!';
    if (streak < 7) return 'On fire!';
    if (streak < 14) return 'Unstoppable!';
    return 'Beast mode!';
  };

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.fireEmoji}>🔥</Text>
        <Text style={[styles.compactStreak, { color: getStreakColor() }]}>
          {streak}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, streak > 0 && styles.containerActive]}>
      <View style={styles.streakBadge}>
        <Text style={styles.fireEmoji}>🔥</Text>
        <Text style={[styles.streakNumber, { color: getStreakColor() }]}>
          {streak}
        </Text>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.streakLabel}>Day Streak</Text>
        <Text style={[styles.streakMessage, { color: getStreakColor() }]}>
          {getStreakMessage()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Full variant
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  containerActive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary + '30', // 30% opacity
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: COLORS.background, // Removed as per request
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.md,
  },
  fireEmoji: {
    fontSize: 24,
    marginRight: SPACING.xs,
  },
  streakNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
  },
  textContainer: {
    flex: 1,
  },
  streakLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  streakMessage: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: 2,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  compactStreak: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginLeft: 2,
  },
});

export default StreakCounter;
