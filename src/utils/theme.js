// IronLog IRON FIRE Theme - Red & Black Edition (2026)
// Modern, minimal, performance-optimized

export const COLORS = {
  /* ================= PRIMARY BRAND - RED FIRE ================= */
  primary: '#E63946',        // Crimson Red - Main CTAs
  primaryDark: '#B71C1C',    // Deep Red - Pressed states
  primaryLight: '#FF4757',   // Bright Red - Highlights

  /* ================= ACCENT COLORS ================= */
  accent: '#FFD700',         // Gold - PRs, achievements
  accentDark: '#FFA500',     // Orange Gold - Secondary
  accentLight: '#FFED4E',    // Light Gold - Shimmer

  /* ================= BACKGROUNDS - DARK FIRE ================= */
  background: '#0D0D0D',     // Near Black (not pure black)
  surface: '#1A1A1A',        // Charcoal - Cards
  card: '#242424',           // Graphite - Elevated cards
  elevated: '#2E2E2E',       // Light Gray - Floating elements

  /* ================= TEXT ================= */
  text: '#F5F5F5',           // Off-White
  textSecondary: '#B0B0B0',  // Gray
  textTertiary: '#6B6B6B',   // Dark Gray

  /* ================= STATUS COLORS ================= */
  success: '#00E38C',        // Neon Green - Completed
  warning: '#FFD166',        // Gold Warning
  error: '#FF4D4F',          // Red Error
  info: '#4CC9F0',           // Cyan Info

  /* ================= UI ELEMENTS ================= */
  border: '#2C2C2C',
  borderLight: '#3A3A3A',
  disabled: '#4A4A4A',

  /* ================= MUSCLE GROUP COLORS ================= */
  chest: '#E63946',          // Red
  back: '#4CC9F0',           // Cyan
  shoulders: '#FFD700',      // Gold
  biceps: '#9B5DE5',         // Purple
  triceps: '#00F5D4',        // Mint
  quadriceps: '#FF006E',     // Pink
  hamstrings: '#F77F00',     // Orange
  glutes: '#FB5607',         // Red-Orange
  calves: '#FFBE0B',         // Yellow
  abs: '#4CC9F0',            // Cyan
  forearms: '#8338EC',       // Purple
  fullBody: '#FF477E',       // Hot Pink

  /* ================= OVERLAYS ================= */
  overlay: 'rgba(13, 13, 13, 0.85)',
  overlayLight: 'rgba(13, 13, 13, 0.65)',
};

export const GRADIENTS = {
  primary: ['#E63946', '#B71C1C'],           // Red gradient
  fire: ['#E63946', '#FF4757'],              // Fire gradient
  gold: ['#FFD700', '#FFA500'],              // Gold gradient
  success: ['#00E38C', '#00C896'],           // Green gradient
  darkCard: ['#1A1A1A', '#242424'],          // Card gradient
  redGlow: ['#E63946', 'rgba(230, 57, 70, 0)'], // Glow effect
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  huge: 32,
  massive: 48,
};

export const FONT_WEIGHTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 50,
  circle: 9999,
};

export const SHADOWS = {
  // Red neon glow effects
  neonRed: {
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  neonGold: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Get color by muscle group
export const getMuscleColor = (muscle) => {
  const muscleMap = {
    'Chest': COLORS.chest,
    'Back': COLORS.back,
    'Shoulders': COLORS.shoulders,
    'Biceps': COLORS.biceps,
    'Triceps': COLORS.triceps,
    'Quadriceps': COLORS.quadriceps,
    'Hamstrings': COLORS.hamstrings,
    'Glutes': COLORS.glutes,
    'Calves': COLORS.calves,
    'Abs': COLORS.abs,
    'Forearms': COLORS.forearms,
    'Full Body': COLORS.fullBody,
  };
  return muscleMap[muscle] || COLORS.primary;
};

// Animation durations
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Common styles
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenPadding: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
};

export default {
  COLORS,
  GRADIENTS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATION,
  getMuscleColor,
  commonStyles,
};