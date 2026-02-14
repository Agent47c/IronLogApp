import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../utils/theme';

const { width } = Dimensions.get('window');

/**
 * Simple Line Chart Component
 * Lightweight, no external dependencies, optimized for 7-day trends
 * 
 * @param {Array} data - Array of objects with {day: 'Mon', value: 45}
 * @param {number} height - Chart height (default: 120)
 * @param {string} color - Line color (default: primary)
 * @param {boolean} showDots - Show data point dots (default: true)
 * @param {boolean} showGrid - Show grid lines (default: true)
 */
const LineChart = ({
  data = [],
  height = 120,
  color = COLORS.primary,
  showDots = true,
  showGrid = true,
  showLabels = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Chart dimensions
  const chartWidth = width - SPACING.md * 4;
  const chartHeight = height - 40; // Leave space for labels
  const paddingTop = 20;
  const paddingBottom = 20;

  // Calculate scales
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = 0;
  const valueRange = maxValue - minValue || 1;

  // Calculate positions
  const stepX = chartWidth / (data.length - 1 || 1);
  
  const getX = (index) => index * stepX;
  const getY = (value) => {
    const normalizedValue = (value - minValue) / valueRange;
    return chartHeight - (normalizedValue * (chartHeight - paddingTop - paddingBottom)) - paddingBottom;
  };

  // Generate path data
  let pathData = '';
  data.forEach((point, index) => {
    const x = getX(index);
    const y = getY(point.value);
    
    if (index === 0) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
  });

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {showGrid && (
          <>
            <Line
              x1="0"
              y1={getY(maxValue)}
              x2={chartWidth}
              y2={getY(maxValue)}
              stroke={COLORS.border}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <Line
              x1="0"
              y1={getY(maxValue / 2)}
              x2={chartWidth}
              y2={getY(maxValue / 2)}
              stroke={COLORS.border}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <Line
              x1="0"
              y1={getY(0)}
              x2={chartWidth}
              y2={getY(0)}
              stroke={COLORS.border}
              strokeWidth="1"
            />
          </>
        )}

        {/* Line path */}
        <Path
          d={pathData}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {showDots && data.map((point, index) => {
          const x = getX(index);
          const y = getY(point.value);
          
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r="5"
              fill={point.value > 0 ? color : COLORS.disabled}
              stroke={COLORS.background}
              strokeWidth="2"
            />
          );
        })}
      </Svg>

      {/* Day labels */}
      {showLabels && (
        <View style={styles.labelContainer}>
          {data.map((point, index) => (
            <Text key={index} style={styles.labelText}>
              {point.day}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  noDataText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.sm,
  },
  labelText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
    flex: 1,
    textAlign: 'center',
  },
});

export default LineChart;
