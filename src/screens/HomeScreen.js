import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, commonStyles } from '../utils/theme';
import { ProfileService, AnalyticsService } from '../services/profileService';
import { useSession } from '../context/SessionContext';
import GlowingButton from '../components/GlowingButton';
import ActiveSessionBanner from '../components/ActiveSessionBanner';

// New Phase 1 & 2 Components
import CircularProgress from '../components/CircularProgress';
import LineChart from '../components/LineChart';
import StreakCounter from '../components/StreakCounter';
import HeatMapCalendar from '../components/HeatMapCalendar';
import AchievementBadge, { ACHIEVEMENTS } from '../components/AchievementBadge';
import AnalyticsHelper from '../services/analyticsHelper';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { activeSession } = useSession();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);

  // Analytics data
  const [streakData, setStreakData] = useState({ streak: 0, status: 'new', message: 'Start your streak today 💪' });
  const [weeklyProgress, setWeeklyProgress] = useState({ percentage: 0, workoutsThisWeek: 0, weeklyGoal: 4 });
  const [chartData, setChartData] = useState([]);
  const [heatMapData, setHeatMapData] = useState([]);
  const [achievements, setAchievements] = useState({});
  const [stats, setStats] = useState({ totalWorkouts: 0, totalVolume: 0 });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel for better performance
      const [
        profileData,
        streakData_result,
        weeklyData,
        weeklyChartData,
        heatData,
        achievementData,
      ] = await Promise.all([
        ProfileService.getProfile(),
        AnalyticsHelper.calculateStreak(),
        AnalyticsHelper.getWeeklyProgress(),
        AnalyticsService.getWeeklyOverview(), // From existing service
        AnalyticsHelper.getHeatMapData(4), // 4 weeks
        AnalyticsHelper.checkAchievements(),
      ]);

      setProfile(profileData);
      setStreakData(streakData_result);
      setWeeklyProgress(weeklyData);
      setChartData(weeklyChartData);
      setHeatMapData(heatData);
      setAchievements(achievementData.achievements);
      setStats(achievementData.stats);

    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Get recently unlocked achievements (show max 3)
  const unlockedAchievements = Object.entries(achievements)
    .filter(([key, unlocked]) => unlocked)
    .slice(0, 3)
    .map(([key]) => key);

  const defaultPaddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : SPACING.md;

  return (
    <View style={commonStyles.container}>
      {/* Active Session Banner */}


      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{profile?.name || 'Athlete'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {profile?.profile_image ? (
              <Image
                source={{ uri: profile.profile_image }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            ) : (
              <Ionicons name="person-circle" size={40} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Streak Counter */}
        <StreakCounter streak={streakData.streak} message={streakData.message} status={streakData.status} />

        {/* Start Workout Button - Hero CTA */}
        {!activeSession && (
          <GlowingButton
            onPress={() => navigation.navigate('Workout')}
            style={styles.startButton}
          >
            <Ionicons name="barbell" size={24} color={COLORS.background} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.startButtonText}>START WORKOUT</Text>
          </GlowingButton>
        )}

        {activeSession && <ActiveSessionBanner navigation={navigation} />}

        {/* Weekly Progress Ring */}
        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>Weekly Goal</Text>
          <View style={styles.progressContainer}>
            <CircularProgress
              progress={weeklyProgress.percentage}
              size={140}
              strokeWidth={14}
              color={COLORS.primary}
              label={`${weeklyProgress.workoutsThisWeek}/${weeklyProgress.weeklyGoal}`}
              sublabel="workouts"
            />
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={styles.statValue}>{weeklyProgress.workoutsThisWeek}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="flag" size={20} color={COLORS.accent} />
                <Text style={styles.statLabel}>Goal</Text>
                <Text style={styles.statValue}>{weeklyProgress.weeklyGoal}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7-Day Activity Chart */}
        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>7-Day Activity</Text>
            <Text style={styles.cardSubtitle}>Minutes per day</Text>
          </View>
          <LineChart
            data={chartData}
            height={140}
            color={COLORS.primary}
            showDots={true}
            showGrid={true}
          />
        </View>

        {/* Heat Map Calendar */}
        <HeatMapCalendar data={heatMapData} weeks={4} />

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <Ionicons name="barbell" size={24} color={COLORS.primary} />
            <Text style={styles.quickStatValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.quickStatLabel}>Total Workouts</Text>
          </View>

          <View style={styles.quickStatCard}>
            <Ionicons name="trending-up" size={24} color={COLORS.accent} />
            <Text style={styles.quickStatValue}>
              {Math.round(stats.totalVolume / 1000)}k
            </Text>
            <Text style={styles.quickStatLabel}>Total Volume</Text>
          </View>

          <View style={styles.quickStatCard}>
            <Ionicons name="flame" size={24} color={COLORS.warning} />
            <Text style={styles.quickStatValue}>{streakData.streak}</Text>
            <Text style={styles.quickStatLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Recent Achievements */}
        {unlockedAchievements.length > 0 && (
          <View style={styles.achievementsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 Recent Achievements</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {unlockedAchievements.map((key) => {
              const achievement = ACHIEVEMENTS[key];
              return (
                <AchievementBadge
                  key={key}
                  type={achievement.type}
                  title={achievement.title}
                  description={achievement.description}
                  icon={achievement.icon}
                  unlocked={true}
                  variant="full"
                />
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Exercises')}
            >
              <Ionicons name="search" size={28} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Exercises</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Plans')}
            >
              <Ionicons name="calendar" size={28} color={COLORS.accent} />
              <Text style={styles.actionLabel}>Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('History')}
            >
              <Ionicons name="time" size={28} color={COLORS.success} />
              <Text style={styles.actionLabel}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Reports')}
            >
              <Ionicons name="stats-chart" size={28} color={COLORS.warning} />
              <Text style={styles.actionLabel}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.md : SPACING.md,
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  userName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    width: '100%',
    marginBottom: SPACING.md,
    marginTop: SPACING.md,

  },
  startButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.background,
    letterSpacing: 1,
  },

  // Progress Card
  progressCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,

  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  progressStats: {
    flex: 1,
    gap: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  statDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // Chart Card
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,

  },
  cardHeader: {
    marginBottom: SPACING.sm,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,

  },

  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  quickStatValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  quickStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  // Achievements Section
  achievementsSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: SPACING.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionCard: {
    width: (width - SPACING.md * 2 - SPACING.sm) / 2,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  actionLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: SPACING.sm,
  },
});