import { getDatabase } from '../database/schema';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';

export const ReportService = {
  
  // Main function to get reports for the last 'n' weeks
  // It checks if a report exists; if not, it generates and saves it.
  getWeeklyReports: async (weeksToLoad = 5) => {
    const db = getDatabase();
    const reports = [];
    const today = new Date();

    try {
      // Loop through the last 'n' weeks
      for (let i = 0; i < weeksToLoad; i++) {
        const dateInWeek = subWeeks(today, i);
        const start = startOfWeek(dateInWeek, { weekStartsOn: 1 }); // Monday start
        const end = endOfWeek(dateInWeek, { weekStartsOn: 1 });
        
        const weekStartStr = format(start, 'yyyy-MM-dd');
        const weekEndStr = format(end, 'yyyy-MM-dd');

        // 1. Check if report already exists in DB
        const existingReport = await db.getFirstAsync(
          `SELECT * FROM weekly_reports WHERE week_start = ?`,
          [weekStartStr]
        );

        if (existingReport) {
          // If this is the CURRENT week, we might want to refresh it to get latest data
          if (i === 0) {
            const updatedReport = await ReportService.generateAndSaveReport(start, end);
            if (updatedReport) reports.push(updatedReport);
          } else {
            // Use cached report
            reports.push({
              ...existingReport,
              report_data: existingReport.report_data ? JSON.parse(existingReport.report_data) : null
            });
          }
        } else {
          // 2. Report missing? Generate it from Session History!
          const newReport = await ReportService.generateAndSaveReport(start, end);
          if (newReport) reports.push(newReport);
        }
      }
      return reports;
    } catch (error) {
      console.error('Error loading weekly reports:', error);
      return [];
    }
  },

  // Generates report from ACTUAL session data and saves to DB
  generateAndSaveReport: async (startDate, endDate) => {
    const db = getDatabase();
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd'); // 23:59:59 technically
    const endStrQuery = format(endDate, 'yyyy-MM-dd') + ' 23:59:59';

    try {
      // 1. Fetch ALL sessions for this week
      const sessions = await db.getAllAsync(
        `SELECT * FROM workout_sessions 
         WHERE session_date >= ? AND session_date <= ? AND is_completed = 1`,
        [startStr, endStr]
      );

      if (sessions.length === 0) return null; // No workouts this week

      // 2. Fetch ALL exercises performed in these sessions (for volume calc)
      // We need to join tables or query efficiently. 
      // Simplified: We assume total_set_duration etc are in session, 
      // but for volume we might need to sum up detailed logs if not stored in session.
      // Let's assume we calculate rough volume from session or need a deeper query.
      
      // OPTION: If you don't store volume in workout_sessions, we query logs:
      const sessionIds = sessions.map(s => s.id).join(',');
      let totalVolume = 0;
      
      if (sessionIds.length > 0) {
        const volumeResult = await db.getFirstAsync(
          `SELECT SUM(weight * reps) as vol 
           FROM exercise_performance 
           WHERE session_id IN (${sessionIds})`
        );
        totalVolume = volumeResult?.vol || 0;
      }

      // 3. Calculate Stats
      const totalWorkouts = sessions.length;
      const totalDuration = sessions.reduce((sum, s) => sum + (s.total_duration || 0), 0);
      
      // Consistency: Simple logic (e.g., target 4 days/week)
      // You can adjust this "4" to be dynamic based on a user setting later
      const consistencyRate = Math.min(totalWorkouts / 4, 1.0); 

      const reportData = {
        generated_at: new Date().toISOString(),
        sessions_ids: sessions.map(s => s.id)
      };

      // 4. Save/Update to Database
      // Check existence again to decide INSERT or UPDATE
      const existing = await db.getFirstAsync(
        `SELECT id FROM weekly_reports WHERE week_start = ?`, 
        [startStr]
      );

      if (existing) {
        await db.runAsync(
          `UPDATE weekly_reports 
           SET total_workouts=?, total_duration=?, total_volume=?, consistency_rate=?, report_data=?
           WHERE id=?`,
          [totalWorkouts, totalDuration, totalVolume, consistencyRate, JSON.stringify(reportData), existing.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO weekly_reports 
           (week_start, week_end, total_workouts, total_duration, total_volume, consistency_rate, report_data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [startStr, endStr, totalWorkouts, totalDuration, totalVolume, consistencyRate, JSON.stringify(reportData)]
        );
      }

      // Return the object for UI
      return {
        week_start: startStr,
        week_end: endStr,
        total_workouts: totalWorkouts,
        total_duration: totalDuration,
        total_volume: totalVolume,
        consistency_rate: consistencyRate,
        report_data: reportData
      };

    } catch (error) {
      console.error('Error generating report:', error);
      return null;
    }
  },

  // Lifetime stats (unchanged, still efficient)
  getAggregateStats: async () => {
    const db = getDatabase();
    try {
      // We can query weekly_reports OR raw sessions. 
      // Raw sessions is more accurate for lifetime totals.
      const stats = await db.getFirstAsync(`
        SELECT 
          COUNT(*) as lifetime_workouts,
          SUM(total_duration) as lifetime_minutes
        FROM workout_sessions 
        WHERE is_completed = 1
      `);
      
      // Separate query for volume to avoid massive joins if not needed
      const volStats = await db.getFirstAsync(`
        SELECT SUM(weight * reps) as lifetime_volume FROM exercise_performance
      `);

      return {
        lifetime_workouts: stats?.lifetime_workouts || 0,
        lifetime_minutes: stats?.lifetime_minutes || 0,
        lifetime_volume: volStats?.lifetime_volume || 0
      };
    } catch (error) {
      console.error('Error fetching aggregate stats:', error);
      return { lifetime_workouts: 0, lifetime_minutes: 0, lifetime_volume: 0 };
    }
  }
};

export default ReportService;