import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS } from '../utils/theme';

/**
 * Simple Pie Chart Component
 * Lightweight donut chart for workout split percentages
 * 
 * @param {Array} data - Array of {label: 'Push', value: 30, color: '#E63946'}
 * @param {number} size - Chart diameter (default: 160)
 * @param {boolean} showLegend - Show legend (default: true)
 */
const PieChart = ({ 
  data = [], 
  size = 160, 
  strokeWidth = 30,
  showLegend = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Calculate total
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No workouts recorded</Text>
      </View>
    );
  }

  // Calculate percentages and create pie slices
  let currentAngle = -90; // Start from top
  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    currentAngle = endAngle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
    };
  });

  // Create SVG path for each slice
  const createArc = (startAngle, endAngle, radius, strokeWidth) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const innerRadius = radius - strokeWidth;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const x3 = centerX + innerRadius * Math.cos(endRad);
    const y3 = centerY + innerRadius * Math.sin(endRad);
    const x4 = centerX + innerRadius * Math.cos(startRad);
    const y4 = centerY + innerRadius * Math.sin(startRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
  };

  const radius = size / 2;

  return (
    <View style={styles.container}>
      {/* Pie Chart */}
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2}
            stroke={COLORS.surface}
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Slices */}
          {slices.map((slice, index) => (
            <Path
              key={index}
              d={createArc(slice.startAngle, slice.endAngle, radius, strokeWidth)}
              fill={slice.color}
            />
          ))}
        </Svg>
        
        {/* Center text */}
        <View style={styles.centerText}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total}</Text>
          <Text style={styles.totalSubtext}>workouts</Text>
        </View>
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legendContainer}>
          {slices.map((slice, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendLabel}>{slice.label}</Text>
                <Text style={styles.legendValue}>
                  {slice.value} ({Math.round(slice.percentage)}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  noDataText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    marginVertical: SPACING.xl,
  },
  chartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  centerText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  totalValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.text,
    marginVertical: 2,
  },
  totalSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  legendContainer: {
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  legendTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  legendValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

export default PieChart;
