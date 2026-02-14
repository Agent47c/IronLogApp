import { getDatabase } from '../database/schema';
import { format } from 'date-fns';

export const SessionService = {
  // Start new session
  startSession: async (planId = null, dayId = null) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const sessionDate = format(new Date(), 'yyyy-MM-dd');
    
    const result = await db.runAsync(
      'INSERT INTO workout_sessions (plan_id, day_id, check_in_time, session_date) VALUES (?, ?, ?, ?)',
      [planId, dayId, now, sessionDate]
    );
    
    return result.lastInsertRowId;
  },

  // End session
  endSession: async (sessionId) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    // Get check-in time
    const session = await db.getFirstAsync(
      'SELECT check_in_time FROM workout_sessions WHERE id = ?',
      [sessionId]
    );
    
    const checkInTime = new Date(session.check_in_time);
    const checkOutTime = new Date(now);
    const duration = Math.floor((checkOutTime - checkInTime) / 1000 / 60); // minutes
    
    await db.runAsync(
      'UPDATE workout_sessions SET check_out_time = ?, total_duration = ?, is_completed = 1 WHERE id = ?',
      [now, duration, sessionId]
    );
    
    return duration;
  },

  // Update cumulative set and rest durations for a session
  updateSessionDurations: async (sessionId, totalSetDuration, totalRestDuration) => {
    const db = getDatabase();
    
    try {
      await db.runAsync(
        'UPDATE workout_sessions SET total_set_duration = ?, total_rest_duration = ? WHERE id = ?',
        [totalSetDuration, totalRestDuration, sessionId]
      );
      
      console.log(`Updated session ${sessionId} durations: Set=${totalSetDuration}s, Rest=${totalRestDuration}s`);
    } catch (error) {
      console.error('Error updating session durations:', error);
      throw error;
    }
  },

  // **NEW: Update session timer state for persistence across screen changes**
  updateSessionTimerState: async (sessionId, timerState, currentExerciseId, totalSetDuration, totalRestDuration) => {
    const db = getDatabase();
    
    try {
      // Convert timer state object to JSON string for SQLite storage
      const timerStateJson = JSON.stringify(timerState);
      
      console.log(`💾 Saving to DB - Session ${sessionId}:`, {
        timerStateJson,
        currentExerciseId,
        totalSetDuration,
        totalRestDuration,
      });
      
      await db.runAsync(
        `UPDATE workout_sessions 
         SET active_timer_state = ?, 
             current_exercise_id = ?, 
             total_set_duration = ?, 
             total_rest_duration = ? 
         WHERE id = ?`,
        [timerStateJson, currentExerciseId, totalSetDuration, totalRestDuration, sessionId]
      );
      
      console.log(`✓ Updated session ${sessionId} timer state`);
    } catch (error) {
      console.error('Error updating session timer state:', error);
      throw error;
    }
  },

  // Add cardio to session
  addCardio: async (sessionId, cardioType, duration, speed = null, distance = null, calories = null) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const result = await db.runAsync(
      'INSERT INTO cardio_records (session_id, cardio_type, duration, speed, distance, calories, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sessionId, cardioType, duration, speed, distance, calories, now]
    );
    
    return result.lastInsertRowId;
  },

  // Log exercise set
  logSet: async (sessionId, exerciseId, exerciseName, setNumber, reps, weight = null, setDuration = null, restDuration = null, notes = null) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const result = await db.runAsync(
      'INSERT INTO exercise_performance (session_id, exercise_id, exercise_name, set_number, reps, weight, set_duration, rest_duration, completed_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sessionId, exerciseId, exerciseName, setNumber, reps, weight, setDuration, restDuration, now, notes]
    );
    
    return result.lastInsertRowId;
  },
  
  updateSetRestDuration: async (performanceId, restDuration) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE exercise_performance SET rest_duration = ? WHERE id = ?',
      [restDuration, performanceId]
    );
  },

  // Get current active session
  getActiveSession: async () => {
    const db = getDatabase();
    const session = await db.getFirstAsync(
      'SELECT * FROM workout_sessions WHERE is_completed = 0 ORDER BY check_in_time DESC LIMIT 1'
    );
    
    // Parse timer state if it exists
    if (session && session.active_timer_state) {
      try {
        session.active_timer_state = JSON.parse(session.active_timer_state);
      } catch (error) {
        console.error('Error parsing timer state:', error);
        session.active_timer_state = null;
      }
    }
    
    return session;
  },

  // Get session by ID
  getSessionById: async (sessionId) => {
    const db = getDatabase();
    const session = await db.getFirstAsync(
      'SELECT * FROM workout_sessions WHERE id = ?',
      [sessionId]
    );
    
    if (session) {
      console.log(`📖 Loading session ${sessionId}:`, {
        active_timer_state: session.active_timer_state,
        current_exercise_id: session.current_exercise_id,
        total_set_duration: session.total_set_duration,
        total_rest_duration: session.total_rest_duration,
      });
      
      // Parse timer state if it exists
      if (session.active_timer_state) {
        try {
          session.active_timer_state = JSON.parse(session.active_timer_state);
          console.log('✓ Parsed timer state:', session.active_timer_state);
        } catch (error) {
          console.error('Error parsing timer state:', error);
          session.active_timer_state = null;
        }
      }
      
      // Get cardio records
      session.cardio = await db.getAllAsync(
        'SELECT * FROM cardio_records WHERE session_id = ?',
        [sessionId]
      );
      
      // Get exercise performance
      const exercises = await db.getAllAsync(
        'SELECT * FROM exercise_performance WHERE session_id = ? ORDER BY completed_at',
        [sessionId]
      );
      
      // Group by exercise
      const exerciseMap = {};
      exercises.forEach(set => {
        if (!exerciseMap[set.exercise_id]) {
          exerciseMap[set.exercise_id] = {
            id: set.exercise_id,
            name: set.exercise_name,
            sets: []
          };
        }
        exerciseMap[set.exercise_id].sets.push(set);
      });
      
      session.exercises = Object.values(exerciseMap);
    }
    
    return session;
  },

  // Get all sessions
  getAllSessions: async (limit = 50) => {
    const db = getDatabase();
    const sessions = await db.getAllAsync(
      'SELECT * FROM workout_sessions WHERE is_completed = 1 ORDER BY session_date DESC, check_in_time DESC LIMIT ?',
      [limit]
    );
    return sessions;
  },

  // Get sessions by date range
  getSessionsByDateRange: async (startDate, endDate) => {
    const db = getDatabase();
    const sessions = await db.getAllAsync(
      'SELECT * FROM workout_sessions WHERE session_date BETWEEN ? AND ? ORDER BY session_date DESC',
      [startDate, endDate]
    );
    return sessions;
  },

  // Get today's session
  getTodaySession: async () => {
    const db = getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    const session = await db.getFirstAsync(
      'SELECT * FROM workout_sessions WHERE session_date = ? ORDER BY check_in_time DESC LIMIT 1',
      [today]
    );
    return session;
  },

  // Delete session
  deleteSession: async (sessionId) => {
    const db = getDatabase();
    await db.runAsync(
      'DELETE FROM workout_sessions WHERE id = ?',
      [sessionId]
    );
  },

  // Get exercise history for specific exercise
  getExerciseHistory: async (exerciseId, limit = 10) => {
    const db = getDatabase();
    const history = await db.getAllAsync(
      `SELECT ep.*, ws.session_date 
       FROM exercise_performance ep
       JOIN workout_sessions ws ON ep.session_id = ws.id
       WHERE ep.exercise_id = ? AND ws.is_completed = 1
       ORDER BY ws.session_date DESC, ep.completed_at DESC
       LIMIT ?`,
      [exerciseId, limit]
    );
    return history;
  },

  // Get personal records
  getPersonalRecords: async (exerciseId) => {
    const db = getDatabase();
    const maxWeight = await db.getFirstAsync(
      `SELECT MAX(weight) as max_weight, reps, session_date
       FROM exercise_performance ep
       JOIN workout_sessions ws ON ep.session_id = ws.id
       WHERE ep.exercise_id = ? AND ws.is_completed = 1
       GROUP BY ep.id
       ORDER BY max_weight DESC
       LIMIT 1`,
      [exerciseId]
    );
    
    const maxReps = await db.getFirstAsync(
      `SELECT MAX(reps) as max_reps, weight, session_date
       FROM exercise_performance ep
       JOIN workout_sessions ws ON ep.session_id = ws.id
       WHERE ep.exercise_id = ? AND ws.is_completed = 1
       GROUP BY ep.id
       ORDER BY max_reps DESC
       LIMIT 1`,
      [exerciseId]
    );
    
    return { maxWeight, maxReps };
  },

  // Update session notes
  updateSessionNotes: async (sessionId, notes) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE workout_sessions SET notes = ? WHERE id = ?',
      [notes, sessionId]
    );
  },
};

export default SessionService;