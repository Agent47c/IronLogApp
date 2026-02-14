import { getDatabase } from '../database/schema';
import EXERCISE_SEED_DATA from '../database/exerciseData';

export const ExerciseService = {
  // Seed exercises into database
  seedExercises: async () => {
    const db = getDatabase();
    try {
      const count = await db.getFirstAsync('SELECT COUNT(*) as count FROM exercises');

      if (count.count === 0) {
        console.log('Seeding exercises...');
        const insertStmt = await db.prepareAsync(
          'INSERT INTO exercises (name, target_muscle, category, difficulty, equipment, tips) VALUES (?, ?, ?, ?, ?, ?)'
        );

        for (const exercise of EXERCISE_SEED_DATA) {
          try {
            await insertStmt.executeAsync([
              exercise.name,
              exercise.target_muscle,
              exercise.category,
              exercise.difficulty,
              exercise.equipment,
              exercise.tips || null,
            ]);
          } catch (error) {
            console.log(`Skipping duplicate: ${exercise.name}`);
          }
        }

        await insertStmt.finalizeAsync();
        console.log(`Seeded ${EXERCISE_SEED_DATA.length} exercises`);
      }
    } catch (error) {
      console.error('Error seeding exercises:', error);
    }
  },

  // Get all exercises
  getAllExercises: async () => {
    const db = getDatabase();
    const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY name ASC');

    return exercises;
  },


  // Search exercises
  searchExercises: async (query) => {
    const db = getDatabase();
    const exercises = await db.getAllAsync(
      'SELECT * FROM exercises WHERE name LIKE ? ORDER BY name ASC',
      [`%${query}%`]
    );
    return exercises;
  },

  // Filter by muscle group
  getExercisesByMuscle: async (muscle) => {
    const db = getDatabase();
    const exercises = await db.getAllAsync(
      'SELECT * FROM exercises WHERE target_muscle = ? ORDER BY name ASC',
      [muscle]
    );
    return exercises;
  },

  // Filter by category
  getExercisesByCategory: async (category) => {
    const db = getDatabase();
    const exercises = await db.getAllAsync(
      'SELECT * FROM exercises WHERE category = ? ORDER BY name ASC',
      [category]
    );
    return exercises;
  },

  // Filter by equipment
  getExercisesByEquipment: async (equipment) => {
    const db = getDatabase();
    const exercises = await db.getAllAsync(
      'SELECT * FROM exercises WHERE equipment = ? ORDER BY name ASC',
      [equipment]
    );
    return exercises;
  },

  // Get favorites
  getFavoriteExercises: async () => {
    const db = getDatabase();
    const exercises = await db.getAllAsync(
      'SELECT * FROM exercises WHERE is_favorite = 1 ORDER BY name ASC'
    );
    return exercises;
  },

  // Toggle favorite
  toggleFavorite: async (exerciseId) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE exercises SET is_favorite = NOT is_favorite WHERE id = ?',
      [exerciseId]
    );
  },

  // Get exercise by ID
  getExerciseById: async (id) => {
    const db = getDatabase();
    const exercise = await db.getFirstAsync(
      'SELECT * FROM exercises WHERE id = ?',
      [id]
    );
    return exercise;
  },

  // Get unique muscle groups
  getMuscleGroups: async () => {
    const db = getDatabase();
    const muscles = await db.getAllAsync(
      'SELECT DISTINCT target_muscle FROM exercises ORDER BY target_muscle'
    );
    return muscles.map(m => m.target_muscle);
  },

  // Get unique categories
  getCategories: async () => {
    const db = getDatabase();
    const categories = await db.getAllAsync(
      'SELECT DISTINCT category FROM exercises ORDER BY category'
    );
    return categories.map(c => c.category);
  },

  // Get unique equipment types
  getEquipmentTypes: async () => {
    const db = getDatabase();
    const equipment = await db.getAllAsync(
      'SELECT DISTINCT equipment FROM exercises ORDER BY equipment'
    );
    return equipment.map(e => e.equipment);
  },
  // Get last session stats for an exercise
  getLastSessionStats: async (exerciseId) => {
    const db = getDatabase();

    // 1. Find the last completed session where this exercise was performed
    const lastSession = await db.getFirstAsync(
      `SELECT ws.id, ws.session_date
       FROM workout_sessions ws
       JOIN exercise_performance ep ON ws.id = ep.session_id
       WHERE ep.exercise_id = ? AND ws.is_completed = 1
       ORDER BY ws.session_date DESC, ws.id DESC
       LIMIT 1`,
      [exerciseId]
    );

    if (!lastSession) return null;

    // 2. Get the sets from that session
    const sets = await db.getAllAsync(
      `SELECT set_number, weight, reps, notes
       FROM exercise_performance
       WHERE session_id = ? AND exercise_id = ?
       ORDER BY set_number ASC`,
      [lastSession.id, exerciseId]
    );

    return {
      date: lastSession.session_date,
      sets: sets
    };
  },
};

export default ExerciseService;
