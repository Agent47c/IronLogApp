import { getDatabase } from '../database/schema';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export const ProfileService = {
  // Create or update profile
  saveProfile: async (name, age, weight, height, fitnessGoal, experienceLevel, profileImage) => {
    const db = getDatabase();

    const existing = await db.getFirstAsync('SELECT id FROM user_profile LIMIT 1');

    if (existing) {
      await db.runAsync(
        'UPDATE user_profile SET name = ?, age = ?, weight = ?, height = ?, fitness_goal = ?, experience_level = ?, profile_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, age, weight, height, fitnessGoal, experienceLevel, profileImage, existing.id]
      );
      return existing.id;
    } else {
      const result = await db.runAsync(
        'INSERT INTO user_profile (name, age, weight, height, fitness_goal, experience_level, profile_image) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, age, weight, height, fitnessGoal, experienceLevel, profileImage]
      );
      return result.lastInsertRowId;
    }
  },

  // Get profile
  getProfile: async () => {
    const db = getDatabase();
    const profile = await db.getFirstAsync('SELECT * FROM user_profile LIMIT 1');
    return profile;
  },

  // Update weight
  updateWeight: async (weight) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE user_profile SET weight = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM user_profile LIMIT 1)'
    );
  },
};

export const AnalyticsService = {
  // Generate weekly report
  generateWeeklyReport: async (weekStart = null) => {
    const db = getDatabase();

    const start = weekStart ? new Date(weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });

    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    // Get all completed sessions in the week
    const sessions = await db.getAllAsync(
      'SELECT * FROM workout_sessions WHERE session_date BETWEEN ? AND ? AND is_completed = 1',
      [startDate, endDate]
    );

    const totalWorkouts = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.total_duration || 0), 0);

    // Get total exercises performed
    const exerciseStats = await db.getFirstAsync(
      `SELECT COUNT(*) as total_exercises, SUM(weight * reps) as total_volume
       FROM exercise_performance ep
       JOIN workout_sessions ws ON ep.session_id = ws.id
       WHERE ws.session_date BETWEEN ? AND ? AND ws.is_completed = 1`,
      [startDate, endDate]
    );

    // Calculate consistency (workouts per week target could be 3-5)
    const consistencyRate = (totalWorkouts / 5) * 100; // Assuming 5 workouts per week is 100%

    const report = {
      week_start: startDate,
      week_end: endDate,
      total_workouts: totalWorkouts,
      total_duration: totalDuration,
      total_exercises: exerciseStats?.total_exercises || 0,
      total_volume: exerciseStats?.total_volume || 0,
      consistency_rate: Math.min(consistencyRate, 100),
      sessions: sessions
    };

    // Save report
    await db.runAsync(
      'INSERT INTO weekly_reports (week_start, week_end, total_workouts, total_duration, total_exercises, total_volume, consistency_rate, report_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [startDate, endDate, totalWorkouts, totalDuration, report.total_exercises, report.total_volume, report.consistency_rate, JSON.stringify(report)]
    );

    return report;
  },

  // Get all reports
  getAllReports: async () => {
    const db = getDatabase();
    const reports = await db.getAllAsync(
      'SELECT * FROM weekly_reports ORDER BY week_start DESC'
    );
    return reports.map(r => ({
      ...r,
      report_data: r.report_data ? JSON.parse(r.report_data) : null
    }));
  },

  // Get stats summary
  getStatsSummary: async () => {
    const db = getDatabase();

    const totalWorkouts = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM workout_sessions WHERE is_completed = 1'
    );

    const totalDuration = await db.getFirstAsync(
      'SELECT SUM(total_duration) as total FROM workout_sessions WHERE is_completed = 1'
    );

    const totalExercises = await db.getFirstAsync(
      'SELECT COUNT(DISTINCT exercise_id) as count FROM exercise_performance'
    );

    const totalVolume = await db.getFirstAsync(
      'SELECT SUM(weight * reps) as volume FROM exercise_performance WHERE weight IS NOT NULL'
    );

    // Get this month's stats
    const thisMonth = format(new Date(), 'yyyy-MM');
    const monthWorkouts = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM workout_sessions WHERE is_completed = 1 AND strftime('%Y-%m', session_date) = ?",
      [thisMonth]
    );

    return {
      total_workouts: totalWorkouts?.count || 0,
      total_duration_minutes: totalDuration?.total || 0,
      unique_exercises: totalExercises?.count || 0,
      total_volume: totalVolume?.volume || 0,
      this_month_workouts: monthWorkouts?.count || 0
    };
  },

  // Get workout frequency by day of week
  getWorkoutFrequency: async () => {
    const db = getDatabase();
    const frequency = await db.getAllAsync(
      `SELECT strftime('%w', session_date) as day_of_week, COUNT(*) as count
       FROM workout_sessions
       WHERE is_completed = 1
       GROUP BY day_of_week
       ORDER BY day_of_week`
    );

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return frequency.map(f => ({
      day: dayNames[parseInt(f.day_of_week)],
      count: f.count
    }));
  },

  // Get most performed exercises
  getMostPerformedExercises: async (limit = 10) => {
    const db = getDatabase();
    const exercises = await db.getAllAsync(
      `SELECT ep.exercise_name, COUNT(*) as times_performed, SUM(ep.weight * ep.reps) as total_volume
       FROM exercise_performance ep
       JOIN workout_sessions ws ON ep.session_id = ws.id
       WHERE ws.is_completed = 1 AND ep.weight IS NOT NULL
       GROUP BY ep.exercise_id
       ORDER BY times_performed DESC
       LIMIT ?`,
      [limit]
    );
    return exercises;
  },

  // Get progress for specific exercise
  getExerciseProgress: async (exerciseId) => {
    const db = getDatabase();
    const progress = await db.getAllAsync(
      `SELECT ws.session_date, MAX(ep.weight) as max_weight, MAX(ep.reps) as max_reps
       FROM exercise_performance ep
       JOIN workout_sessions ws ON ep.session_id = ws.id
       WHERE ep.exercise_id = ? AND ws.is_completed = 1
       GROUP BY ws.session_date
       ORDER BY ws.session_date ASC`,
      [exerciseId]
    );
    return progress;
  },

  // Get 30 days workout calendar (centered around today)
  getWorkoutCalendar: async () => {
    const db = getDatabase();
    const calendarDays = [];

    // Generate range: 14 days before today, today, 15 days after (Total 30)
    for (let i = -14; i <= 15; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const isToday = i === 0;
      const isFuture = i > 0;

      let hasWorkout = false;
      if (!isFuture) { // Don't check DB for future dates
        const result = await db.getFirstAsync(
          'SELECT id FROM workout_sessions WHERE session_date = ? AND is_completed = 1',
          [dateStr]
        );
        hasWorkout = !!result;
      }

      calendarDays.push({
        date: dateStr,
        hasWorkout,
        isToday,
        isFuture,
        dayName: format(date, 'EEE'), // Mon, Tue, Wed
        dayLetter: format(date, 'EEEEE'), // M, T, W
        dayNumber: format(date, 'd'), // 12
        fullDate: date // Date object for sorting/comparison if needed
      });
    }

    return calendarDays;
  },

  // Get daily summary for Overview Card
  getDailySummary: async (dateStr) => {
    const db = getDatabase();

    // Get session for this date
    const session = await db.getFirstAsync(
      'SELECT * FROM workout_sessions WHERE session_date = ? AND is_completed = 1',
      [dateStr]
    );

    if (!session) return null;

    // Get performance details
    const stats = await db.getFirstAsync(
      `SELECT 
        COUNT(DISTINCT exercise_id) as total_exercises,
        COUNT(*) as total_sets,
        SUM(reps) as total_reps,
        SUM(rest_time) as total_rest_time,
        SUM(set_duration) as total_set_duration
       FROM exercise_performance 
       WHERE session_id = ?`,
      [session.id]
    );

    return {
      duration: session.total_duration || 0,
      checkIn: session.check_in_time ? format(new Date(session.check_in_time), 'hh:mm a') : '-',
      checkOut: session.check_out_time ? format(new Date(session.check_out_time), 'hh:mm a') : '-',
      exercises: stats?.total_exercises || 0,
      sets: stats?.total_sets || 0,
      reps: stats?.total_reps || 0,
      restTime: stats?.total_rest_time || 0,
      setTime: stats?.total_set_duration || 0,
      PlanName: 'Custom Workout' // Placeholder or fetch plan name if needed
    };
  },

  // Get intensity of last workout for Date Color logic
  getLastWorkoutIntensity: async () => {
    const db = getDatabase();
    // Get the most recent completed workout
    // distinct from "end_time" which doesn't exist, use id or check_out_time
    const lastWorkout = await db.getFirstAsync(
      'SELECT id, total_duration FROM workout_sessions WHERE is_completed = 1 ORDER BY id DESC LIMIT 1'
    );

    if (!lastWorkout) return 'neutral';

    // Get rest time for this workout
    const sets = await db.getAllAsync(
      'SELECT rest_time FROM exercise_performance WHERE session_id = ?',
      [lastWorkout.id]
    );

    const totalRest = sets.reduce((sum, set) => sum + (set.rest_time || 0), 0);
    const totalDuration = lastWorkout.total_duration || 1; // Avoid division by zero

    // Intensity ratio: (Total Time - Rest Time) / Total Time
    // Higher ratio = Higher Intensity (Less rest)
    const activeTime = totalDuration - totalRest;
    const intensityRatio = activeTime / totalDuration;

    if (intensityRatio < 0.3) return 'low'; // High rest (> 70%) -> Red
    if (intensityRatio > 0.6) return 'high'; // Low rest (< 40%) -> Green
    return 'medium'; // Medium rest -> Orange/Yellow
  },

  // Get weekly overview for Bar Chart
  getWeeklyOverview: async () => {
    const db = getDatabase();
    const overview = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const session = await db.getFirstAsync(
        'SELECT total_duration FROM workout_sessions WHERE session_date = ? AND is_completed = 1',
        [dateStr]
      );

      if (session) {
        console.log(`Found session for ${dateStr}: duration ${session.total_duration}`);
      } else {
        // console.log(`No session for ${dateStr}`);
      }

      overview.push({
        day: format(date, 'EEE'), // Mon
        value: session ? Math.round(session.total_duration / 60) : 0, // Duration in minutes
        fullDate: dateStr
      });
    }
    return overview;
  }
};

export default { ProfileService, AnalyticsService };
