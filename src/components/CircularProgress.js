import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../utils/theme';

/**
 * Circular Progress Ring Component
 * Lightweight, performant circular progress indicator
 * 
 * @param {number} progress - Progress value (0-100)
 * @param {number} size - Diameter of the circle (default: 120)
 * @param {number} strokeWidth - Width of the ring (default: 12)
 * @param {string} color - Color of the progress ring (default: primary)
 * @param {string} backgroundColor - Color of the background ring (default: surface)
 * @param {string} label - Text label inside circle
 * @param {string} sublabel - Secondary text below label
 */
const CircularProgress = ({
  progress = 0,
  size = 120,
  strokeWidth = 12,
  color = COLORS.primary,
  backgroundColor = COLORS.surface,
  label = '',
  sublabel = '',
  showPercentage = true,
}) => {
  // Clamp progress between 0-100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      
      {/* Center Content */}
      <View style={styles.centerContent}>
        {showPercentage && (
          <Text style={styles.percentageText}>
            {Math.round(clampedProgress)}%
          </Text>
        )}
        {label && (
          <Text style={styles.labelText}>{label}</Text>
        )}
        {sublabel && (
          <Text style={styles.sublabelText}>{sublabel}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  labelText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sublabelText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
});

export default CircularProgress;
