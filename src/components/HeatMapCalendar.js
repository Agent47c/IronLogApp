import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS } from '../utils/theme';

/**
 * Heat Map Calendar Component
 * GitHub-style calendar showing workout frequency
 * 
 * @param {Array} data - Array of {date: 'YYYY-MM-DD', hasWorkout: boolean, intensity: 0-100}
 * @param {number} weeks - Number of weeks to show (default: 4)
 */
const HeatMapCalendar = ({ data = [], weeks = 4 }) => {
  const cellSize = 36;
  const cellGap = 4;

  // Group data by weeks (7 days each)
  const groupedData = [];
  for (let i = 0; i < weeks; i++) {
    const weekData = data.slice(i * 7, (i + 1) * 7);
    if (weekData.length > 0) {
      groupedData.push(weekData);
    }
  }

  const getIntensityColor = (intensity, hasWorkout) => {
    if (!hasWorkout) return COLORS.surface;

    if (intensity >= 80) return COLORS.primary;
    if (intensity >= 60) return COLORS.primary + 'CC'; // 80% opacity
    if (intensity >= 40) return COLORS.primary + '99'; // 60% opacity
    if (intensity >= 20) return COLORS.primary + '66'; // 40% opacity
    return COLORS.primary + '33'; // 20% opacity
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Activity</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.calendarContainer}>
          {/* Day labels */}
          <View style={styles.dayLabelsContainer}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <Text key={index} style={styles.dayLabel}>
                {day}
              </Text>
            ))}
          </View>

          {/* Heat map grid */}
          <View style={styles.gridContainer}>
            {groupedData.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekColumn}>
                {week.map((day, dayIndex) => {
                  const intensity = day.intensity || (day.hasWorkout ? 80 : 0);
                  const color = getIntensityColor(intensity, day.hasWorkout);

                  return (
                    <View
                      key={dayIndex}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: color,
                          width: cellSize,
                          height: cellSize,
                          marginBottom: cellGap,
                        },
                        day.isToday && styles.cellToday,
                      ]}
                    >
                      {day.hasWorkout && (
                        <Text style={styles.cellText}>✓</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendLabel}>Less</Text>
        <View style={styles.legendSquares}>
          {[0, 20, 40, 60, 80].map((intensity, index) => (
            <View
              key={index}
              style={[
                styles.legendSquare,
                { backgroundColor: getIntensityColor(intensity, true) }
              ]}
            />
          ))}
        </View>
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  scrollContent: {
    paddingRight: SPACING.md,
  },
  calendarContainer: {
    flexDirection: 'row',
  },
  dayLabelsContainer: {
    marginRight: SPACING.xs,
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHTS.medium,
    height: 36,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  weekColumn: {
    flexDirection: 'column',
  },
  cell: {
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cellToday: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  cellText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  legendLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  legendSquares: {
    flexDirection: 'row',
    gap: 4,
  },
  legendSquare: {
    width: 16,
    height: 16,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

export default HeatMapCalendar;
