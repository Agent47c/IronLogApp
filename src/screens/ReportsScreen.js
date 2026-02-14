import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles, SHADOWS } from '../utils/theme';
import ReportService from '../services/reportService';
import { AnalyticsService } from '../services/profileService';
import AnalyticsHelper from '../services/analyticsHelper';

// Phase 2 Components
import PieChart from '../components/PieChart';
import LineChart from '../components/LineChart';

const { width } = Dimensions.get('window');

export default function ReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [range, setRange] = useState('30D');
  const [workoutSplit, setWorkoutSplit] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalVolume: 0,
    totalDuration: 0,
    avgDuration: 0,
  });

  const ranges = ['7D', '30D', '90D'];

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [range])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;

      const [splitData, aggregateStats, weeklyOverview] = await Promise.all([
        AnalyticsHelper.getWorkoutSplit(days),
        ReportService.getAggregateStats(),
        AnalyticsService.getWeeklyOverview(), // Last 7 days for trend
      ]);

      setWorkoutSplit(splitData);
      setWeeklyTrend(weeklyOverview);

      // Calculate averages
      const avgDuration = aggregateStats.lifetime_workouts > 0
        ? Math.round(aggregateStats.lifetime_minutes / aggregateStats.lifetime_workouts)
        : 0;

      setStats({
        totalWorkouts: aggregateStats.lifetime_workouts,
        totalVolume: Math.round(aggregateStats.lifetime_volume / 1000), // Convert to kg
        totalDuration: aggregateStats.lifetime_minutes,
        avgDuration,
      });

    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>Track your progress</Text>
        </View>

        {/* Range Selector */}
        <View style={styles.rangeContainer}>
          {ranges.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangePill, range === r && styles.rangePillActive]}
              onPress={() => handleRangeChange(r)}
            >
              <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overall Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="barbell" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color={COLORS.accent} />
            <Text style={styles.statValue}>{stats.avgDuration}min</Text>
            <Text style={styles.statLabel}>Avg Duration</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{stats.totalVolume}k</Text>
            <Text style={styles.statLabel}>Total Volume</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="timer" size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>{Math.round(stats.totalDuration / 60)}h</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>

        {/* 7-Day Activity Trend */}
        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>7-Day Activity Trend</Text>
            <Text style={styles.cardSubtitle}>Workout duration in minutes</Text>
          </View>
          <LineChart
            data={weeklyTrend}
            height={160}
            color={COLORS.primary}
            showDots={true}
            showGrid={true}
          />
        </View>

        {/* Workout Split Pie Chart */}
        {workoutSplit.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Workout Split</Text>
              <Text style={styles.cardSubtitle}>Last {range}</Text>
            </View>
            <PieChart
              data={workoutSplit}
              size={180}
              strokeWidth={35}
              showLegend={true}
            />
          </View>
        )}

        {/* Insights Card */}
        <View style={styles.insightsCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="bulb" size={24} color={COLORS.accent} />
            <Text style={styles.insightTitle}>Insights</Text>
          </View>

          {workoutSplit.length > 0 ? (
            <>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Most trained:</Text>
                <Text style={styles.insightValue}>
                  {workoutSplit[0].label} ({workoutSplit[0].value} sessions)
                </Text>
              </View>

              {stats.totalWorkouts >= 10 && (
                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>Consistency:</Text>
                  <Text style={[styles.insightValue, { color: COLORS.success }]}>
                    {stats.totalWorkouts >= 50 ? 'Excellent' : 'Good'}
                  </Text>
                </View>
              )}

              {stats.avgDuration > 0 && (
                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>Avg intensity:</Text>
                  <Text style={styles.insightValue}>
                    {stats.avgDuration < 40 ? 'Light' : stats.avgDuration < 60 ? 'Moderate' : 'High'}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.insightEmpty}>
              Complete more workouts to see personalized insights!
            </Text>
          )}
        </View>

        {/* Call to Action */}
        <TouchableOpacity
          style={styles.ctaCard}
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="time" size={32} color={COLORS.primary} />
          <View style={styles.ctaTextContainer}>
            <Text style={styles.ctaTitle}>View Full History</Text>
            <Text style={styles.ctaSubtitle}>See all your workout sessions</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  pageTitle: {
    fontSize: FONT_SIZES.huge,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Range Selector
  rangeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  rangePill: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  rangePillActive: {
    backgroundColor: COLORS.primary,
  },
  rangeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  rangeTextActive: {
    color: COLORS.background,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    width: (width - SPACING.md * 2 - SPACING.sm) / 2,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  // Chart Cards
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardHeader: {
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },

  // Insights Card
  insightsCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  insightTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  insightLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  insightValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  insightEmpty: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // CTA Card
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  ctaTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  ctaTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  ctaSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});