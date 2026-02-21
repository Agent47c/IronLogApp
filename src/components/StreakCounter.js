import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS } from '../utils/theme';

/**
 * Workout Streak Counter Component
 * Shows current workout streak with dynamic messaging
 *
 * @param {number}  streak  - Current streak count
 * @param {string}  message - Dynamic message from calculateStreak
 * @param {string}  status  - 'new' | 'active' | 'warning_low' | 'warning_high' | 'broken'
 * @param {string}  variant - 'compact' or 'full' (default: 'full')
 */
const StreakCounter = ({ streak = 0, message, status = 'new', variant = 'full' }) => {

  // Derive colours and icon from status
  const getStatusColor = () => {
    switch (status) {
      case 'active': return COLORS.primary;
      case 'warning_low': return COLORS.warning;
      case 'warning_high': return '#FF6B00'; // deep orange
      case 'broken': return COLORS.error || '#E63946';
      case 'new':
      default: return COLORS.textSecondary;
    }
  };

  const getEmoji = () => {
    switch (status) {
      case 'active': return '🔥';
      case 'warning_low': return '⏳';
      case 'warning_high': return '⚠️';
      case 'broken': return '💔';
      case 'new':
      default: return '💪';
    }
  };

  const displayMessage = message || (streak > 0 ? `${streak} Day Streak` : 'Start your streak today 💪');
  const statusColor = getStatusColor();
  const emoji = getEmoji();

  // ─── Compact variant ───
  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactEmoji}>{emoji}</Text>
        <Text style={[styles.compactStreak, { color: statusColor }]}>
          {streak}
        </Text>
      </View>
    );
  }

  // ─── Full variant ───
  return (
    <View style={[
      styles.container,
      status === 'active' && styles.containerActive,
      (status === 'warning_low' || status === 'warning_high') && styles.containerWarning,
      status === 'broken' && styles.containerBroken,
    ]}>
      <View style={styles.streakBadge}>
        <Text style={styles.fireEmoji}>{emoji}</Text>
        {streak > 0 && (
          <Text style={[styles.streakNumber, { color: statusColor }]}>
            {streak}
          </Text>
        )}
      </View>

      <View style={styles.textContainer}>
        {streak > 0 && <Text style={styles.streakLabel}>Day Streak</Text>}
        <Text style={[styles.streakMessage, { color: statusColor }]}>
          {displayMessage}
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
    borderColor: COLORS.primary + '30',
  },
  containerWarning: {
    backgroundColor: COLORS.card,
    borderColor: (COLORS.warning || '#FFB800') + '40',
  },
  containerBroken: {
    backgroundColor: COLORS.surface,
    borderColor: (COLORS.error || '#E63946') + '30',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  compactEmoji: {
    fontSize: 16,
  },
  compactStreak: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginLeft: 2,
  },
});

export default StreakCounter;
