import { getDatabase } from '../database/schema';

export const WorkoutPlanService = {
  // Create new workout plan with rotation-based workouts
  createPlan: async (planData) => {
    const db = getDatabase();
    
    // Insert the plan (type defaults to 'Custom' to satisfy NOT NULL constraint)
    const result = await db.runAsync(
      'INSERT INTO workout_plans (name, type, description) VALUES (?, ?, ?)',
      [planData.name, 'Custom', planData.description || '']
    );
    
    const planId = result.lastInsertRowId;
    
    // Insert workouts (rotation days)
    if (planData.workouts && planData.workouts.length > 0) {
      for (const workout of planData.workouts) {
        const dayResult = await db.runAsync(
          'INSERT INTO plan_days (plan_id, day_name, day_order, notes) VALUES (?, ?, ?, ?)',
          [planId, workout.name, workout.order, null]
        );
        
        const dayId = dayResult.lastInsertRowId;
        
        // Insert exercises for this workout
        // Using week_priority field (your current schema) instead of notes
        if (workout.exercises && workout.exercises.length > 0) {
          for (let i = 0; i < workout.exercises.length; i++) {
            const exercise = workout.exercises[i];
            
            await db.runAsync(
              'INSERT INTO plan_exercises (day_id, exercise_id, exercise_order, target_sets, target_reps) VALUES (?, ?, ?, ?, ? )',
              [
                dayId,
                exercise.id,
                i,
                exercise.sets,
                `${exercise.reps_min}-${exercise.reps_max}`,
                null
              ]
            );
          }
        }
      }
    }
    
    return planId;
  },

  // Update existing workout plan
  updatePlan: async (planId, planData) => {
    const db = getDatabase();
    
    // Update plan details (type defaults to 'Custom' to satisfy NOT NULL constraint)
    await db.runAsync(
      'UPDATE workout_plans SET name = ?, type = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [planData.name, 'Custom', planData.description || '', planId]
    );
    
    // Delete existing days and exercises
    await db.runAsync('DELETE FROM plan_days WHERE plan_id = ?', [planId]);
    
    // Insert updated workouts
    if (planData.workouts && planData.workouts.length > 0) {
      for (const workout of planData.workouts) {
        const dayResult = await db.runAsync(
          'INSERT INTO plan_days (plan_id, day_name, day_order, notes) VALUES (?, ?, ?, ?)',
          [planId, workout.name, workout.order, null]
        );
        
        const dayId = dayResult.lastInsertRowId;
        
        // Insert exercises for this workout
        // Using week_priority field (your current schema) instead of notes
        if (workout.exercises && workout.exercises.length > 0) {
          for (let i = 0; i < workout.exercises.length; i++) {
            const exercise = workout.exercises[i];
            
            await db.runAsync(
              'INSERT INTO plan_exercises (day_id, exercise_id, exercise_order, target_sets, target_reps) VALUES (?, ?, ?, ?, ?)',
              [
                dayId,
                exercise.id,
                i,
                exercise.sets,
                `${exercise.reps_min}-${exercise.reps_max}`,
                null
              ]
            );
          }
        }
      }
    }
    
    return planId;
  },

  // Get all plans
  getAllPlans: async () => {
    const db = getDatabase();
    const plans = await db.getAllAsync(
      'SELECT * FROM workout_plans ORDER BY created_at DESC'
    );
    return plans;
  },

  // Get plan by ID with workouts and exercises
  getPlanById: async (planId) => {
    const db = getDatabase();
    const plan = await db.getFirstAsync(
      'SELECT * FROM workout_plans WHERE id = ?',
      [planId]
    );

    if (plan) {
      // Get workouts (days) for this plan
      const days = await db.getAllAsync(
        'SELECT * FROM plan_days WHERE plan_id = ? ORDER BY day_order',
        [planId]
      );

      // Get exercises for each workout
      const workouts = [];
      for (const day of days) {
        const exercises = await db.getAllAsync(
          `SELECT pe.*, e.name, e.target_muscle, e.category, e.equipment
           FROM plan_exercises pe
           JOIN exercises e ON pe.exercise_id = e.id
           WHERE pe.day_id = ?
           ORDER BY pe.exercise_order`,
          [day.id]
        );
        
        // Parse reps range and convert to exercise format
        const formattedExercises = exercises.map(ex => {
          const repsRange = ex.target_reps || '8-12';
          const [repsMin, repsMax] = repsRange.split('-').map(r => parseInt(r.trim()));
          
          return {
            id: ex.exercise_id,
            name: ex.name,
            target_muscle: ex.target_muscle,
            category: ex.category,
            equipment: ex.equipment,
            sets: ex.target_sets,
            reps_min: repsMin || 8,
            reps_max: repsMax || 12,
            reps: repsMin || 8, // For backward compatibility
          };
        });
        
        workouts.push({
          id: day.id,
          name: day.day_name,
          order: day.day_order,
          exercises: formattedExercises,
        });
      }

      plan.workouts = workouts;
      plan.workout_days = workouts; // For backward compatibility
    }

    return plan;
  },

  // Add day to plan (legacy support)
  addDayToPlan: async (planId, dayName, dayOrder, notes = null) => {
    const db = getDatabase();
    const result = await db.runAsync(
      'INSERT INTO plan_days (plan_id, day_name, day_order, notes) VALUES (?, ?, ?, ?)',
      [planId, dayName, dayOrder, notes]
    );
    return result.lastInsertRowId;
  },

  // Add exercise to day (legacy support)
  addExerciseToDay: async (dayId, exerciseId, order, targetSets = 3, targetReps = '8-12', weekPriority = null) => {
    const db = getDatabase();
    
    const result = await db.runAsync(
      'INSERT INTO plan_exercises (day_id, exercise_id, exercise_order, target_sets, target_reps) VALUES (?, ?, ?, ?, ?)',
      [dayId, exerciseId, order, targetSets, targetReps, weekPriority]
    );
    return result.lastInsertRowId;
  },

  // Remove exercise from day
  removeExerciseFromDay: async (planExerciseId) => {
    const db = getDatabase();
    await db.runAsync(
      'DELETE FROM plan_exercises WHERE id = ?',
      [planExerciseId]
    );
  },

  // Update exercise order
  updateExerciseOrder: async (planExerciseId, newOrder) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE plan_exercises SET exercise_order = ? WHERE id = ?',
      [newOrder, planExerciseId]
    );
  },

  // Set active plan
  setActivePlan: async (planId) => {
    const db = getDatabase();
    // Deactivate all plans first
    await db.runAsync('UPDATE workout_plans SET is_active = 0');
    // Activate selected plan
    await db.runAsync(
      'UPDATE workout_plans SET is_active = 1 WHERE id = ?',
      [planId]
    );
  },

  // Get active plan
  getActivePlan: async () => {
    const db = getDatabase();
    const plan = await db.getFirstAsync(
      'SELECT * FROM workout_plans WHERE is_active = 1'
    );

    if (plan) {
      return await WorkoutPlanService.getPlanById(plan.id);
    }
    return null;
  },

  // Delete plan
  deletePlan: async (planId) => {
    const db = getDatabase();
    await db.runAsync(
      'DELETE FROM workout_plans WHERE id = ?',
      [planId]
    );
  },

  // Delete day from plan
  deleteDay: async (dayId) => {
    const db = getDatabase();
    await db.runAsync(
      'DELETE FROM plan_days WHERE id = ?',
      [dayId]
    );
  },

  // Get next workout in rotation
  getNextWorkout: async (planId, lastCompletedWorkoutOrder = -1) => {
    const db = getDatabase();
    
    // Get all workouts for the plan
    const workouts = await db.getAllAsync(
      'SELECT * FROM plan_days WHERE plan_id = ? ORDER BY day_order',
      [planId]
    );
    
    if (workouts.length === 0) return null;
    
    // Get next workout in rotation
    const nextOrder = (lastCompletedWorkoutOrder + 1) % workouts.length;
    const nextWorkout = workouts[nextOrder];
    
    // Get exercises for this workout
    const exercises = await db.getAllAsync(
      `SELECT pe.*, e.name, e.target_muscle, e.category, e.equipment
       FROM plan_exercises pe
       JOIN exercises e ON pe.exercise_id = e.id
       WHERE pe.day_id = ?
       ORDER BY pe.exercise_order`,
      [nextWorkout.id]
    );
    
    // Format exercises
    const formattedExercises = exercises.map(ex => {
      const repsRange = ex.target_reps || '8-12';
      const [repsMin, repsMax] = repsRange.split('-').map(r => parseInt(r.trim()));
      
      return {
        id: ex.exercise_id,
        name: ex.name,
        target_muscle: ex.target_muscle,
        category: ex.category,
        equipment: ex.equipment,
        sets: ex.target_sets,
        reps_min: repsMin || 8,
        reps_max: repsMax || 12,
      };
    });
    
    return {
      id: nextWorkout.id,
      name: nextWorkout.day_name,
      order: nextWorkout.day_order,
      exercises: formattedExercises,
    };
  },
};

export default WorkoutPlanService;