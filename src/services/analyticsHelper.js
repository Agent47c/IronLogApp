import { getDatabase } from '../database/schema';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';

/**
 * Analytics Helper Service
 * Lightweight functions for calculating streaks, achievements, and stats
 * Optimized for performance - minimal DB queries
 */
export const AnalyticsHelper = {

  /**
   * Calculate current workout streak with 2-day grace period.
   * Returns { streak, daysSinceLastWorkout, message, status }
   *
   * Status values:
   *   'new'          – no workouts recorded
   *   'active'       – streak is live (worked out today)
   *   'warning_low'  – 1 day skipped
   *   'warning_high' – 2 days skipped (last chance)
   *   'broken'       – 3+ days skipped, streak reset
   */
  calculateStreak: async () => {
    const db = getDatabase();

    try {
      // ── 1. Fetch completed session dates (descending) ──
      const sessions = await db.getAllAsync(
        `SELECT DISTINCT session_date 
         FROM workout_sessions 
         WHERE is_completed = 1 
         ORDER BY session_date DESC 
         LIMIT 200`
      );

      // No workouts at all
      if (!sessions || sessions.length === 0) {
        return {
          streak: 0,
          daysSinceLastWorkout: -1,
          status: 'new',
          message: 'Start your streak today 💪',
        };
      }

      // ── 2. Determine plan-aware grace period ──
      // If the user has an active plan with N training days,
      // the expected gap between workouts is (7 / N) rounded up.
      // We clamp the grace period between 2 and 3.
      let gracePeriod = 2; // default

      try {
        const activePlan = await db.getFirstAsync(
          `SELECT wp.id, COUNT(pd.id) as total_days
           FROM workout_plans wp
           JOIN plan_days pd ON pd.plan_id = wp.id
           WHERE wp.is_active = 1
           GROUP BY wp.id
           LIMIT 1`
        );

        if (activePlan && activePlan.total_days > 0) {
          const expectedGap = Math.ceil(7 / activePlan.total_days);
          gracePeriod = Math.max(2, Math.min(expectedGap, 3));
        }
      } catch (_) {
        // Non-critical – fall back to default grace period
      }

      // ── 3. Calculate days since last workout ──
      const mostRecent = sessions[0].session_date;
      const daysSinceLastWorkout = differenceInDays(
        new Date(),
        parseISO(mostRecent)
      );

      // ── 4. Count streak (allow gaps up to gracePeriod) ──
      let streak = 0;
      const sessionSet = new Set(sessions.map(s => s.session_date));

      // Walk backwards from today
      let cursor = new Date();
      let consecutiveMisses = 0;

      // If we haven't worked out today, start counting misses from today
      const todayStr = format(cursor, 'yyyy-MM-dd');
      if (!sessionSet.has(todayStr)) {
        consecutiveMisses = daysSinceLastWorkout;
        // If already past grace period, streak is broken
        if (consecutiveMisses > gracePeriod) {
          return {
            streak: 0,
            daysSinceLastWorkout,
            status: 'broken',
            message: 'Your streak has ended. Start again today!',
          };
        }
        // Jump cursor to the most recent workout date
        cursor = parseISO(mostRecent);
      }

      // Now walk backwards from cursor, counting workout days
      // Allow gaps of up to gracePeriod between any two workout dates
      for (let i = 0; i < 400; i++) {
        const dateStr = format(subDays(cursor, 0), 'yyyy-MM-dd');
        if (sessionSet.has(dateStr)) {
          streak++;
          // Move cursor back one day and reset gap counter
          cursor = subDays(cursor, 1);
          consecutiveMisses = 0;
        } else {
          consecutiveMisses++;
          if (consecutiveMisses > gracePeriod) break;
          cursor = subDays(cursor, 1);
        }
      }

      // ── 5. Determine status & message ──
      let status, message;

      if (daysSinceLastWorkout === 0) {
        status = 'active';
        message = `🔥 ${streak} Day Streak`;
      } else if (daysSinceLastWorkout === 1) {
        status = 'warning_low';
        message = 'Start exercise today to continue your streak.';
      } else if (daysSinceLastWorkout === 2) {
        status = 'warning_high';
        message = '⚠️ Start exercise today or your streak will break.';
      } else {
        status = 'broken';
        streak = 0;
        message = 'Your streak has ended. Start again today!';
      }

      return { streak, daysSinceLastWorkout, status, message };
    } catch (error) {
      console.error('Error calculating streak:', error);
      return {
        streak: 0,
        daysSinceLastWorkout: -1,
        status: 'new',
        message: 'Start your streak today 💪',
      };
    }
  },

  /**
   * Get workout split data for pie chart
   * Returns array of {label, value, color}
   */
  getWorkoutSplit: async (days = 30) => {
    const db = getDatabase();

    try {
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Get workout sessions with plan day names
      const sessions = await db.getAllAsync(
        `SELECT ws.id, ws.session_date, pd.day_name
         FROM workout_sessions ws
         LEFT JOIN plan_days pd ON ws.day_id = pd.id
         WHERE ws.is_completed = 1 AND ws.session_date >= ?
         ORDER BY ws.session_date DESC`,
        [startDate]
      );

      if (!sessions || sessions.length === 0) return [];

      // Count by day type (Push, Pull, Legs, etc.)
      const splitCounts = {};
      sessions.forEach(session => {
        const dayName = session.day_name || 'Custom';
        splitCounts[dayName] = (splitCounts[dayName] || 0) + 1;
      });

      // Convert to chart data with colors
      const splitColors = {
        'Push': '#E63946',      // Red
        'Pull': '#4CC9F0',      // Cyan
        'Legs': '#FFD700',      // Gold
        'Upper': '#9B5DE5',     // Purple
        'Lower': '#FF006E',     // Pink
        'Full Body': '#00F5D4', // Mint
        'Custom': '#B0B0B0',    // Gray
      };

      const chartData = Object.entries(splitCounts).map(([label, value]) => ({
        label,
        value,
        color: splitColors[label] || '#6B6B6B',
      }));

      return chartData;
    } catch (error) {
      console.error('Error getting workout split:', error);
      return [];
    }
  },

  /**
   * Check achievement status
   * Returns object with unlocked achievements
   */
  checkAchievements: async () => {
    const db = getDatabase();

    try {
      // Get total stats
      const stats = await db.getFirstAsync(`
        SELECT 
          COUNT(*) as total_workouts,
          SUM(total_duration) as total_duration
        FROM workout_sessions 
        WHERE is_completed = 1
      `);

      const volumeStats = await db.getFirstAsync(`
        SELECT SUM(weight * reps) as total_volume 
        FROM exercise_performance 
        WHERE weight IS NOT NULL
      `);

      const streakData = await AnalyticsHelper.calculateStreak();
      const streak = streakData.streak;

      const totalWorkouts = stats?.total_workouts || 0;
      const totalVolume = (volumeStats?.total_volume || 0) / 1000; // Convert to kg

      // Check each achievement
      const achievements = {
        FIRST_WORKOUT: totalWorkouts >= 1,
        WEEK_STREAK: streak >= 7,
        MONTH_STREAK: streak >= 30,
        TON_LIFTED: totalVolume >= 1000,
        HEAVY_HITTER: totalVolume >= 10000,
        TEN_WORKOUTS: totalWorkouts >= 10,
        FIFTY_WORKOUTS: totalWorkouts >= 50,
        HUNDRED_WORKOUTS: totalWorkouts >= 100,
      };

      return {
        achievements,
        stats: {
          totalWorkouts,
          totalVolume,
          streak,
        }
      };
    } catch (error) {
      console.error('Error checking achievements:', error);
      return {
        achievements: {},
        stats: {
          totalWorkouts: 0,
          totalVolume: 0,
          streak: 0,
        }
      };
    }
  },

  /**
   * Get heat map data for calendar
   * Returns array suitable for HeatMapCalendar component
   */
  getHeatMapData: async (weeks = 4) => {
    const db = getDatabase();

    try {
      const days = weeks * 7;
      const heatMapData = [];

      // Generate date range
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');

        // Check if workout exists for this date
        const session = await db.getFirstAsync(
          `SELECT id, total_duration FROM workout_sessions 
           WHERE session_date = ? AND is_completed = 1`,
          [dateStr]
        );

        // Calculate intensity based on duration
        let intensity = 0;
        if (session) {
          const duration = session.total_duration || 0;
          // Map duration to intensity (0-100)
          // 0-30 min = 20%, 30-45 = 40%, 45-60 = 60%, 60-90 = 80%, 90+ = 100%
          if (duration >= 90) intensity = 100;
          else if (duration >= 60) intensity = 80;
          else if (duration >= 45) intensity = 60;
          else if (duration >= 30) intensity = 40;
          else intensity = 20;
        }

        heatMapData.push({
          date: dateStr,
          hasWorkout: !!session,
          intensity,
          isToday: i === 0,
        });
      }

      return heatMapData;
    } catch (error) {
      console.error('Error getting heat map data:', error);
      return [];
    }
  },

  /**
   * Get weekly workout count (for circular progress)
   * Returns percentage of weekly goal completion
   */
  getWeeklyProgress: async (weeklyGoal = 4) => {
    const db = getDatabase();

    try {
      // Get workouts this week (Monday to Sunday)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since Monday

      const monday = format(subDays(today, mondayOffset), 'yyyy-MM-dd');
      const sunday = format(subDays(today, mondayOffset - 6), 'yyyy-MM-dd');

      const result = await db.getFirstAsync(
        `SELECT COUNT(*) as count 
         FROM workout_sessions 
         WHERE session_date BETWEEN ? AND ? 
         AND is_completed = 1`,
        [monday, sunday]
      );

      const workoutsThisWeek = result?.count || 0;
      const percentage = Math.min((workoutsThisWeek / weeklyGoal) * 100, 100);

      return {
        workoutsThisWeek,
        weeklyGoal,
        percentage: Math.round(percentage),
      };
    } catch (error) {
      console.error('Error getting weekly progress:', error);
      return {
        workoutsThisWeek: 0,
        weeklyGoal,
        percentage: 0,
      };
    }
  },
};

export default AnalyticsHelper;