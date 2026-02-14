import * as SQLite from 'expo-sqlite';

const DB_NAME = 'ironlog.db';

let db = null;

export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Create tables
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      -- User Profile Table
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER,
        weight REAL,
        height REAL,
        fitness_goal TEXT,
        experience_level TEXT,
        profile_image TEXT,
        haptics_enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Exercise Library Table
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        target_muscle TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT,
        equipment TEXT,
        video_path TEXT,
        tips TEXT,
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Workout Plans Table
      CREATE TABLE IF NOT EXISTS workout_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Custom',
        description TEXT,
        is_active INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Plan Days Table (workout rotation days)
      CREATE TABLE IF NOT EXISTS plan_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        day_name TEXT NOT NULL,
        day_order INTEGER NOT NULL,
        notes TEXT,
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
      );
      
      -- Plan Exercises Table (exercises within each day)
      CREATE TABLE IF NOT EXISTS plan_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        exercise_order INTEGER NOT NULL,
        target_sets INTEGER DEFAULT 3,
        target_reps TEXT DEFAULT '8-12',
        notes TEXT,
        FOREIGN KEY (day_id) REFERENCES plan_days(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );
      
      -- Workout Sessions Table
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        day_id INTEGER,
        check_in_time TEXT NOT NULL,
        check_out_time TEXT,
        total_duration INTEGER,
        session_date TEXT NOT NULL,
        notes TEXT,
        is_completed INTEGER DEFAULT 0,
        active_timer_state TEXT,
        current_exercise_id INTEGER,
        total_set_duration INTEGER DEFAULT 0,
        total_rest_duration INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id),
        FOREIGN KEY (day_id) REFERENCES plan_days(id)
      );
      
      -- Cardio Records Table
      CREATE TABLE IF NOT EXISTS cardio_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        cardio_type TEXT NOT NULL,
        duration INTEGER NOT NULL,
        speed REAL,
        distance REAL,
        calories REAL,
        started_at TEXT,
        ended_at TEXT,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
      );
      
      -- Exercise Performance Table (workout logs for tracking weight/reps)
      CREATE TABLE IF NOT EXISTS exercise_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        exercise_name TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL,
        rest_time INTEGER,
        set_duration INTEGER,
        rest_duration INTEGER,
        completed_at TEXT,
        notes TEXT,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      
      -- Weekly Reports Table
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        total_workouts INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        total_exercises INTEGER DEFAULT 0,
        total_volume REAL DEFAULT 0,
        consistency_rate REAL DEFAULT 0,
        report_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON workout_sessions(session_date);
      CREATE INDEX IF NOT EXISTS idx_performance_session ON exercise_performance(session_id);
      CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(target_muscle);
      CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
      CREATE INDEX IF NOT EXISTS idx_plan_exercises_day ON plan_exercises(day_id);
      CREATE INDEX IF NOT EXISTS idx_plan_days_plan ON plan_days(plan_id);
    `);

    // **ADD TIMER STATE COLUMNS TO EXISTING DATABASES**
    // This migration will run safely on existing databases
    await addTimerStateColumnsIfNeeded();

    // **ADD PROFILE IMAGE COLUMN**
    await addProfileImageColumnIfNeeded();

    // **ADD PLAN EXERCISE COLUMNS**
    await addPlanExerciseColumnsIfNeeded();

    // **ADD HAPTICS COLUMN**
    await addHapticsColumnIfNeeded();

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

/**
 * Add profile_image column to existing user_profile table
 */
const addProfileImageColumnIfNeeded = async () => {
  try {
    const tableInfo = await db.getAllAsync('PRAGMA table_info(user_profile)');
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('profile_image')) {
      await db.execAsync(`
        ALTER TABLE user_profile 
        ADD COLUMN profile_image TEXT DEFAULT NULL;
      `);
      console.log('✓ Added profile_image column to user_profile');
    }
  } catch (error) {
    console.error('Error adding profile_image column:', error);
  }
};

/**
 * Add timer state columns to existing workout_sessions table
 * This is safe to run multiple times - it checks if columns exist first
 */
const addTimerStateColumnsIfNeeded = async () => {
  try {
    // Get current table structure
    const tableInfo = await db.getAllAsync('PRAGMA table_info(workout_sessions)');
    const columnNames = tableInfo.map(col => col.name);

    // Add active_timer_state column if it doesn't exist
    if (!columnNames.includes('active_timer_state')) {
      await db.execAsync(`
        ALTER TABLE workout_sessions 
        ADD COLUMN active_timer_state TEXT DEFAULT NULL;
      `);
      console.log('✓ Added active_timer_state column to workout_sessions');
    }

    // Add current_exercise_id column if it doesn't exist
    if (!columnNames.includes('current_exercise_id')) {
      await db.execAsync(`
        ALTER TABLE workout_sessions 
        ADD COLUMN current_exercise_id INTEGER DEFAULT NULL;
      `);
      console.log('✓ Added current_exercise_id column to workout_sessions');
    }

    // Add total_set_duration column if it doesn't exist
    if (!columnNames.includes('total_set_duration')) {
      await db.execAsync(`
        ALTER TABLE workout_sessions 
        ADD COLUMN total_set_duration INTEGER DEFAULT 0;
      `);
      console.log('✓ Added total_set_duration column to workout_sessions');
    }

    // Add total_rest_duration column if it doesn't exist
    if (!columnNames.includes('total_rest_duration')) {
      await db.execAsync(`
        ALTER TABLE workout_sessions 
        ADD COLUMN total_rest_duration INTEGER DEFAULT 0;
      `);
      console.log('✓ Added total_rest_duration column to workout_sessions');
    }

  } catch (error) {
    console.error('Error adding timer state columns:', error);
    // Don't throw - this is a non-critical migration
    // The columns might already exist from the CREATE TABLE statement
  }
};

/**
 * Add target_sets and target_reps to plan_exercises if needed
 */
const addPlanExerciseColumnsIfNeeded = async () => {
  try {
    const tableInfo = await db.getAllAsync('PRAGMA table_info(plan_exercises)');
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('target_sets')) {
      await db.execAsync(`
        ALTER TABLE plan_exercises 
        ADD COLUMN target_sets INTEGER DEFAULT 3;
      `);
      console.log('✓ Added target_sets column to plan_exercises');
    }

    if (!columnNames.includes('target_reps')) {
      await db.execAsync(`
        ALTER TABLE plan_exercises 
        ADD COLUMN target_reps TEXT DEFAULT '8-12';
      `);
      console.log('✓ Added target_reps column to plan_exercises');
    }

    // Also check for notes column while we are at it
    if (!columnNames.includes('notes')) {
      await db.execAsync(`
        ALTER TABLE plan_exercises 
        ADD COLUMN notes TEXT;
      `);
      console.log('✓ Added notes column to plan_exercises');
    }

  } catch (error) {
    console.error('Error adding plan_exercises columns:', error);
  }
};

/**
 * Add haptics_enabled column to user_profile if needed
 */
const addHapticsColumnIfNeeded = async () => {
  try {
    const tableInfo = await db.getAllAsync('PRAGMA table_info(user_profile)');
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('haptics_enabled')) {
      await db.execAsync(`
        ALTER TABLE user_profile 
        ADD COLUMN haptics_enabled INTEGER DEFAULT 1;
      `);
      console.log('✓ Added haptics_enabled column to user_profile');
    }
  } catch (error) {
    console.error('Error adding haptics_enabled column:', error);
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
};

export default {
  initDatabase,
  getDatabase
};