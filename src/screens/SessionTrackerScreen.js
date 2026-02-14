import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator, // Added for loading state
} from 'react-native';
import { format } from 'date-fns';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles, getMuscleColor } from '../utils/theme';
import SessionService from '../services/sessionService';
import ExerciseService from '../services/exerciseService';
import WorkoutPlanService from '../services/workoutPlanService';
import HapticFeedback from '../utils/haptics';
import { showAlert } from '../components/CustomAlertDialog';
import GlowingButton from '../components/GlowingButton';
import { useSession } from '../context/SessionContext';

export default function SessionTrackerScreen({ route, navigation }) {
  const { sessionId, planId, workoutId } = route.params;
  const { updateActiveSession, clearSession } = useSession();

  // === STATE ===
  const [isLoading, setIsLoading] = useState(true); // FIX: Loading state to prevent race conditions

  // Session timing
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalSeconds, setTotalSeconds] = useState(0);

  // Cumulative set timing (like total time - never resets)
  const [cumulativeSetStartTime, setCumulativeSetStartTime] = useState(null);
  const [totalSetSeconds, setTotalSetSeconds] = useState(0);
  const [pausedSetSeconds, setPausedSetSeconds] = useState(0);

  // Cumulative rest timing (like total time - never resets)
  const [cumulativeRestStartTime, setCumulativeRestStartTime] = useState(null);
  const [totalRestSeconds, setTotalRestSeconds] = useState(0);
  const [pausedRestSeconds, setPausedRestSeconds] = useState(0);

  // Current set timing (for individual set display)
  const [setStartTime, setSetStartTime] = useState(null);
  const [setSeconds, setSetSeconds] = useState(0);
  const [isSetActive, setIsSetActive] = useState(false);

  // Rest timing (for individual rest display)
  const [restStartTime, setRestStartTime] = useState(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);

  // Workout data
  const [exercises, setExercises] = useState([]);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [currentExerciseStartTime, setCurrentExerciseStartTime] = useState(null);

  // Exercise progress - persisted state
  const [exerciseProgress, setExerciseProgress] = useState({});

  // Modal state
  const [showSetModal, setShowSetModal] = useState(false);
  const [setReps, setSetReps] = useState('');
  const [setWeight, setSetWeight] = useState('');

  // === REFS ===
  const totalTimerRef = useRef(null);
  const setTimerRef = useRef(null);
  const restTimerRef = useRef(null);
  const dataLoadedRef = useRef(false);
  const saveTimerDebounceRef = useRef(null);

  // Refs to track state for cleanup
  const currentStateRef = useRef({
    isSetActive: false,
    isResting: false,
    cumulativeSetStartTime: null,
    cumulativeRestStartTime: null,
    setStartTime: null,
    restStartTime: null,
    currentExercise: null,
    pausedSetSeconds: 0,
    pausedRestSeconds: 0,
    exerciseProgress: {}, // FIX: key to solving stale closure issues
  });

  // === REMOVED: Back button intercept - users can navigate freely now ===
  // Timers continue running in background, session persists

  // === CANCEL BUTTON (Header) ===
  // Kept for manual specific "Cancel" header button, but acts same as back now? 
  // User asked for "Cancel" button in header previously. 
  // Maybe explicit "Cancel" button should just trigger the same menu or specific cancel?
  // Let's map it to the same exit handler for consistency or keep specific 'delete' logic?
  // User said "When user tries to go back... show alert". 
  // The header "Cancel" button explicitly means "I want to cancel".
  // Let's keep existing logic for Header Cancel but maybe update text or verify consistency. 
  // For now, I will leave Header Cancel as "Destructive Delete" specific action, 
  // and Back Button as "Exit Menu". 
  const handleHeaderCancel = React.useCallback(() => {
    showAlert({
      type: 'destructive',
      title: 'Cancel Workout?',
      message: 'Are you sure you want to cancel and delete this workout?',
      buttons: [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await SessionService.deleteSession(sessionId);
            clearSession();
            navigation.navigate('MainTabs');
          }
        }
      ]
    });
  }, [sessionId, clearSession, navigation]);

  // Last Session Stats
  const [lastSessionStats, setLastSessionStats] = useState(null);

  // Load last session stats when currentExercise changes
  useEffect(() => {
    if (currentExercise) {
      loadLastSessionStats(currentExercise.id);
    }
  }, [currentExercise?.id]);

  const loadLastSessionStats = async (exerciseId) => {
    try {
      const stats = await ExerciseService.getLastSessionStats(exerciseId);
      setLastSessionStats(stats);
    } catch (error) {
      console.error('Error loading last session stats:', error);
    }
  };

  useEffect(() => {
    // Add Cancel Button to Header
    navigation.setOptions({
      headerRight: () => (
        <GlowingButton
          onPress={handleHeaderCancel}
          glowColor={COLORS.error}
          style={{
            height: 36,
            paddingHorizontal: SPACING.md,
            marginRight: SPACING.xs,
          }}
          textStyle={{
            fontSize: FONT_SIZES.sm,
            fontWeight: 'bold',
            color: COLORS.error
          }}
        >
          Cancel
        </GlowingButton>
      ),
    });
  }, [navigation, handleHeaderCancel]);

  useEffect(() => {
    const initializeScreen = async () => {
      if (!dataLoadedRef.current) {
        setIsLoading(true); // Start loading
        try {
          // FIX: Chain the data loading to prevent race condition
          // 1. Load workout and GET the list immediately
          const loadedExercises = await loadWorkoutData();

          // 2. Pass that list directly to loadSessionData
          await loadSessionData(loadedExercises);

        } catch (e) {
          console.error("Init error", e);
        } finally {
          setIsLoading(false); // Finish loading
          dataLoadedRef.current = true;
        }
      }
    };

    initializeScreen();

    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      if (setTimerRef.current) clearInterval(setTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      if (saveTimerDebounceRef.current) clearTimeout(saveTimerDebounceRef.current);

      const saveOnUnmount = async () => {
        try {
          const now = new Date();
          const state = currentStateRef.current;

          let currentSetDuration = state.pausedSetSeconds;
          let currentRestDuration = state.pausedRestSeconds;

          if (state.isSetActive && state.cumulativeSetStartTime) {
            const elapsed = Math.floor((now - state.cumulativeSetStartTime) / 1000);
            currentSetDuration += elapsed;
          }

          if (state.isResting && state.cumulativeRestStartTime) {
            const elapsed = Math.floor((now - state.cumulativeRestStartTime) / 1000);
            currentRestDuration += elapsed;
          }

          const timerState = {
            isSetActive: state.isSetActive,
            isResting: state.isResting,
            cumulativeSetStartTime: state.cumulativeSetStartTime?.toISOString() || null,
            cumulativeRestStartTime: state.cumulativeRestStartTime?.toISOString() || null,
            setStartTime: state.setStartTime?.toISOString() || null,
            restStartTime: state.restStartTime?.toISOString() || null,

            // FIX: Save initial/base paused seconds to prevent double counting on restore
            pausedSetSeconds: state.pausedSetSeconds,
            pausedRestSeconds: state.pausedRestSeconds,

            // REVERT: Save full exerciseProgress object (simpler, robust)
            exerciseProgress: state.exerciseProgress || {},
          };

          await SessionService.updateSessionTimerState(
            sessionId,
            timerState,
            state.currentExercise?.id || null,
            currentSetDuration,
            currentRestDuration
          );
        } catch (error) {
          console.error('Error saving on unmount:', error);
        }
      };

      saveOnUnmount();
    };
  }, [sessionId, planId]);

  // === LOAD DATA ===
  const loadWorkoutData = async () => {
    try {
      let effectivePlanId = planId;
      let effectiveWorkoutId = workoutId;

      // Fallback: if route params are missing, look up from the session record
      if (!effectivePlanId || !effectiveWorkoutId) {
        const session = await SessionService.getActiveSession();
        if (session) {
          effectivePlanId = effectivePlanId || session.plan_id;
          effectiveWorkoutId = effectiveWorkoutId || session.day_id;
        }
      }

      if (!effectivePlanId || !effectiveWorkoutId) {
        showAlert({ type: 'error', title: 'Error', message: 'Missing workout information' });
        return [];
      }

      const plan = await WorkoutPlanService.getPlanById(effectivePlanId);
      if (!plan) {
        showAlert({ type: 'error', title: 'Error', message: 'Workout plan not found' });
        return [];
      }

      const workouts = plan.workouts || plan.workout_days || [];
      const currentWorkout = workouts.find(w => w.id === effectiveWorkoutId);

      if (!currentWorkout) {
        showAlert({ type: 'error', title: 'Error', message: 'Workout not found' });
        return [];
      }

      const loadedExercises = currentWorkout.exercises || [];
      setExercises(loadedExercises);
      return loadedExercises; // FIX: Return list for immediate use
    } catch (error) {
      console.error('Error loading workout:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to load workout' });
      return [];
    }
  };

  // FIX: Accept availableExercises argument to avoid stale state
  const loadSessionData = async (availableExercises = []) => {
    try {
      const session = await SessionService.getSessionById(sessionId);

      if (session) {
        // Parse timer state early
        let savedState = null;
        if (session.active_timer_state) {
          savedState = typeof session.active_timer_state === 'string'
            ? JSON.parse(session.active_timer_state)
            : session.active_timer_state;
        }

        const startTime = new Date(session.check_in_time);
        setSessionStartTime(startTime);

        // Total Session Time - simple calculation from start
        const elapsedRaw = Math.floor((new Date() - startTime) / 1000);
        setTotalSeconds(Math.max(0, elapsedRaw));

        const savedSetDuration = session.total_set_duration || 0;
        const savedRestDuration = session.total_rest_duration || 0;

        // FIX: Prefer JSON state for base paused seconds if available (prevents double counting)
        // If not available (legacy), use the DB total duration
        const baseSetSeconds = (savedState && typeof savedState.pausedSetSeconds === 'number')
          ? savedState.pausedSetSeconds
          : savedSetDuration;

        const baseRestSeconds = (savedState && typeof savedState.pausedRestSeconds === 'number')
          ? savedState.pausedRestSeconds
          : savedRestDuration;

        setPausedSetSeconds(baseSetSeconds);
        setPausedRestSeconds(baseRestSeconds);

        // Initial visual value (will be updated by interval)
        setTotalSetSeconds(baseSetSeconds);
        setTotalRestSeconds(baseRestSeconds);

        // Load exercise progress
        let progress = {};
        const savedProgress = savedState?.exerciseProgress || {};

        if (session.exercises && session.exercises.length > 0) {
          session.exercises.forEach(ex => {
            const sets = ex.sets || [];
            // Check saved object
            const isCompleted = savedProgress[ex.id]?.completed || false;

            progress[ex.id] = {
              sets: sets,
              completed: isCompleted,
              totalSets: sets.length,
              startTime: sets.length > 0 ? sets[0].completed_at : null,
              lastSetId: sets.length > 0 ? sets[sets.length - 1].id : null,
            };
          });

          setExerciseProgress(progress);
        }

        // FIX: Use availableExercises argument to set current exercise immediately
        if (session.current_exercise_id && availableExercises.length > 0) {
          // Use loose comparison (==) to handle string/number ID differences
          const exercise = availableExercises.find(ex => ex.id == session.current_exercise_id);
          if (exercise) {
            setCurrentExercise(exercise);
            const exerciseProgress = progress[exercise.id];
            setCurrentExerciseStartTime(exerciseProgress?.startTime || new Date().toISOString());
            console.log('✓ Restored current exercise:', exercise.name);

            // SYNC CONTEXT
            updateActiveSession({
              sessionId,
              planId,
              workoutId,
              exerciseName: exercise.name,
              status: 'working'
            });
          } else {
            console.log('⚠️ Could not find exercise ID in list:', session.current_exercise_id);
          }
        }

        // Restore timer states
        if (savedState) {
          console.log('Restoring timer state:', savedState);

          // Restore cumulative set timer  
          if (savedState.isSetActive && savedState.cumulativeSetStartTime) {
            const cumulativeStart = new Date(savedState.cumulativeSetStartTime);
            setCumulativeSetStartTime(cumulativeStart);
            setIsSetActive(true);

            // FIX: Don't manually set totalSetSeconds here - the timer interval handles it
            // Removed: setTotalSetSeconds(savedSetDuration + elapsed);

            // Restore individual set timer
            if (savedState.setStartTime) {
              const individualStart = new Date(savedState.setStartTime);
              setSetStartTime(individualStart);
              const setElapsed = Math.floor((new Date() - individualStart) / 1000);
              setSetSeconds(setElapsed);
              console.log(`✓ Restored SET timer: ${setElapsed}s elapsed`);

              // SYNC CONTEXT
              updateActiveSession({
                status: 'working',
                startTime: individualStart
              });
            }
          }

          // Restore cumulative rest timer
          if (savedState.isResting && savedState.cumulativeRestStartTime) {
            const cumulativeStart = new Date(savedState.cumulativeRestStartTime);
            setCumulativeRestStartTime(cumulativeStart);
            setIsResting(true);

            // Restore individual rest timer
            if (savedState.restStartTime) {
              const individualStart = new Date(savedState.restStartTime);
              setRestStartTime(individualStart);
              const restElapsed = Math.floor((new Date() - individualStart) / 1000);
              setRestSeconds(restElapsed);
              console.log(`✓ Restored REST timer: ${restElapsed}s elapsed`);

              // SYNC CONTEXT
              updateActiveSession({
                status: 'resting',
                startTime: individualStart
              });
            }
          }

          console.log('✓ Timer state restoration complete');
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // === SAVE TIMER STATE TO BACKEND ===
  const saveTimerStateToBackend = async (exerciseProgressOverride = null, extraState = {}) => {
    // FIX: Prevent saving before data is fully loaded to avoid overwriting with empty state
    if (!dataLoadedRef.current && !exerciseProgressOverride && Object.keys(extraState).length === 0) {
      console.log('🛑 Blocked saveTimerStateToBackend - Data not loaded yet');
      return;
    }

    try {
      const now = new Date();

      let currentSetDuration = pausedSetSeconds;
      let currentRestDuration = pausedRestSeconds;

      if (isSetActive && cumulativeSetStartTime) {
        const elapsed = Math.floor((now - cumulativeSetStartTime) / 1000);
        currentSetDuration += elapsed;
      }

      if (isResting && cumulativeRestStartTime) {
        const elapsed = Math.floor((now - cumulativeRestStartTime) / 1000);
        currentRestDuration += elapsed;
      }

      // FIX: Use ref to get LATEST state (avoids stale closure bugs)
      const effectiveProgress = exerciseProgressOverride || currentStateRef.current.exerciseProgress || {};

      const timerState = {
        isSetActive,
        isResting,
        cumulativeSetStartTime: cumulativeSetStartTime?.toISOString() || null,
        cumulativeRestStartTime: cumulativeRestStartTime?.toISOString() || null,
        setStartTime: setStartTime?.toISOString() || null,
        restStartTime: restStartTime?.toISOString() || null,

        // FIX: Save the BASE paused seconds (snapshot before current activity)
        // This is crucial for correctly restoring the timer state without double counting
        pausedSetSeconds,
        pausedRestSeconds,

        // Save full exerciseProgress object
        exerciseProgress: effectiveProgress,
        ...extraState
      };

      console.log('DEBUG: Saving timerState:', JSON.stringify(timerState));

      await SessionService.updateSessionTimerState(
        sessionId,
        timerState,
        currentExercise?.id || null,
        currentSetDuration,
        currentRestDuration
      );
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };

  const debouncedSaveTimerState = () => {
    if (saveTimerDebounceRef.current) {
      clearTimeout(saveTimerDebounceRef.current);
    }

    saveTimerDebounceRef.current = setTimeout(() => {
      saveTimerStateToBackend();
    }, 2000);
  };

  useEffect(() => {
    if (sessionId && dataLoadedRef.current) {
      currentStateRef.current = {
        isSetActive,
        isResting,
        cumulativeSetStartTime,
        cumulativeRestStartTime,
        setStartTime,
        restStartTime,
        currentExercise,
        pausedSetSeconds,
        pausedRestSeconds,
        exerciseProgress, // FIX: Keep ref in sync with state
      };

      debouncedSaveTimerState();
    }
  }, [isSetActive, isResting, currentExercise?.id, cumulativeSetStartTime, cumulativeRestStartTime, pausedSetSeconds, pausedRestSeconds, exerciseProgress]); // Added exerciseProgress dependency

  // === TIMERS ===
  useEffect(() => {
    if (sessionStartTime) {
      totalTimerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - sessionStartTime) / 1000);
        setTotalSeconds(Math.max(0, elapsed));
      }, 1000);
    } else {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    }

    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [sessionStartTime]);

  useEffect(() => {
    if (isSetActive && cumulativeSetStartTime) {
      setTimerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - cumulativeSetStartTime) / 1000);
        setTotalSetSeconds(pausedSetSeconds + elapsed);
      }, 1000);
    } else {
      if (setTimerRef.current) clearInterval(setTimerRef.current);
    }

    return () => {
      if (setTimerRef.current) clearInterval(setTimerRef.current);
    };
  }, [isSetActive, cumulativeSetStartTime, pausedSetSeconds]);

  useEffect(() => {
    if (isResting && cumulativeRestStartTime) {
      restTimerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - cumulativeRestStartTime) / 1000);
        setTotalRestSeconds(pausedRestSeconds + elapsed);
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting, cumulativeRestStartTime, pausedRestSeconds]);

  useEffect(() => {
    if (isSetActive && setStartTime) {
      const intervalId = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - setStartTime) / 1000);
        setSetSeconds(elapsed);
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [isSetActive, setStartTime]);

  useEffect(() => {
    if (isResting && restStartTime) {
      const intervalId = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - restStartTime) / 1000);
        setRestSeconds(elapsed);
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [isResting, restStartTime]);

  // === HELPER FUNCTIONS ===
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCompletedSets = () => {
    if (!currentExercise) return [];
    const progress = exerciseProgress[currentExercise.id];
    return progress?.sets || [];
  };

  const getExerciseStatus = (exercise) => {
    const progress = exerciseProgress[exercise.id];
    if (!progress) return 'not_started';
    if (progress.completed) return 'completed';
    if (progress.sets && progress.sets.length > 0) return 'in_progress';
    return 'not_started';
  };



  // === EXERCISE SELECTION ===
  const selectExercise = (exercise) => {
    // 1. Safety check: Don't allow selection if still loading
    if (isLoading) return;

    // 2. If clicking on the same exercise that's already active, do nothing
    if (currentExercise?.id === exercise.id) {
      console.log('👍 Already on this exercise - continuing');
      return;
    }

    // 3. FIX: "Orphan Timer" Handling
    // If a timer is running but currentExercise is null (lost context),
    // and user clicks an exercise, assume it's the right one and switch SILENTLY (restore context).
    const isTimerRunning = isSetActive || isResting;

    if (isTimerRunning && !currentExercise) {
      console.log('❤️ Recovering orphan timer for:', exercise.name);
      switchToExercise(exercise);
      return;
    }

    // 4. Normal Switch Logic
    // check if exercise is completed
    const progress = exerciseProgress[exercise.id];
    if (progress && progress.completed) {
      showAlert({
        type: 'confirm',
        title: 'Exercise Completed',
        message: 'This exercise is marked as completed. Do you still want to access it?',
        buttons: [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => performSwitch(exercise) }
        ],
      });
      return;
    }

    performSwitch(exercise);
  };

  const performSwitch = (exercise) => {
    // Only show switch alert if clicking on a DIFFERENT exercise while timers are active
    const isTimerRunning = isSetActive || isResting;

    if (isTimerRunning && currentExercise && currentExercise.id !== exercise.id) {
      showAlert({
        type: 'confirm',
        title: 'Switch Exercise?',
        message: `You're currently ${isSetActive ? 'doing a set' : 'resting'} on ${currentExercise?.name}. Switch to ${exercise.name}?`,
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', onPress: () => switchToExercise(exercise) }
        ],
      });
    } else {
      switchToExercise(exercise);
    }
  };

  const switchToExercise = (exercise) => {
    // FIX: Only pause/reset timers if we strictly have a previous exercise AND it is different
    // If currentExercise is null (orphaned timer), we do NOT treat it as "Different".
    // This allows us to "adopt" the running timer into the new exercise.
    const isDifferentExercise = currentExercise && currentExercise.id !== exercise.id;

    if (isDifferentExercise) {
      // Pause cumulative timers and reset individual timers
      if (isSetActive && cumulativeSetStartTime) {
        const now = new Date();
        const elapsed = Math.floor((now - cumulativeSetStartTime) / 1000);
        setPausedSetSeconds(pausedSetSeconds + elapsed);
        setCumulativeSetStartTime(null);
        setIsSetActive(false);
        setSetSeconds(0);
      }

      if (isResting && cumulativeRestStartTime) {
        const now = new Date();
        const elapsed = Math.floor((now - cumulativeRestStartTime) / 1000);
        setPausedRestSeconds(pausedRestSeconds + elapsed);
        setCumulativeRestStartTime(null);
        setIsResting(false);
        setRestSeconds(0);
      }
    }

    // Switch to new exercise
    setCurrentExercise(exercise);

    const existingProgress = exerciseProgress[exercise.id];

    if (existingProgress && existingProgress.startTime) {
      setCurrentExerciseStartTime(existingProgress.startTime);
    } else {
      const startTime = new Date().toISOString();
      setCurrentExerciseStartTime(startTime);

      // Initialize progress if needed
      if (!exerciseProgress[exercise.id]) {
        setExerciseProgress(prev => ({
          ...prev,
          [exercise.id]: {
            sets: [],
            completed: false,
            totalSets: 0,
            startTime: startTime,
            lastSetId: null,
          }
        }));
      }
    }

    setTimeout(() => saveTimerStateToBackend(), 100);

    // SYNC CONTEXT
    updateActiveSession({
      exerciseName: exercise.name,
      // If we switched, we likely paused timers or reset them.
      // If we want to show "ready" state or just keep previous status if paused?
      // Since `switchToExercise` pauses timers logic:
      status: 'working', // Default back to working view (ready to start set)
      startTime: null // Stop banner timer until set starts
    });
  };

  // === SET ACTIONS ===
  const startSet = () => {
    if (!currentExercise) {
      showAlert({ type: 'warning', title: 'No Exercise Selected', message: 'Please select an exercise first' });
      return;
    }

    const completedSets = getCompletedSets();
    const targetSets = currentExercise.sets || 3;

    if (completedSets.length >= targetSets) {
      showAlert({
        type: 'success',
        title: 'Target Sets Complete',
        message: `You've completed ${completedSets.length}/${targetSets} sets for ${currentExercise.name}.`,
        buttons: [
          { text: 'Add Extra Set', onPress: () => beginSet() },
          { text: 'Mark Complete', onPress: () => completeExercise() }
        ],
      });
      return;
    }

    beginSet();
  };

  const beginSet = () => {
    if (isResting && cumulativeRestStartTime) {
      const now = new Date();
      const elapsed = Math.floor((now - cumulativeRestStartTime) / 1000);
      setPausedRestSeconds(pausedRestSeconds + elapsed);
      setCumulativeRestStartTime(null);

      const progress = exerciseProgress[currentExercise.id];
      if (progress?.lastSetId) {
        SessionService.updateSetRestDuration(progress.lastSetId, restSeconds);
      }

      setIsResting(false);
      setRestSeconds(0);
    }

    if (!cumulativeSetStartTime) {
      setCumulativeSetStartTime(new Date());
    }

    setSetStartTime(new Date());
    setSetSeconds(0);
    setIsSetActive(true);

    // SYNC CONTEXT
    updateActiveSession({
      status: 'working',
      startTime: new Date()
    });
  };

  const completeSet = () => {
    if (!isSetActive) return;

    if (cumulativeSetStartTime) {
      const now = new Date();
      const elapsed = Math.floor((now - cumulativeSetStartTime) / 1000);
      setPausedSetSeconds(pausedSetSeconds + elapsed);
      setCumulativeSetStartTime(null);
    }

    setIsSetActive(false);

    const completedSets = getCompletedSets();
    const lastSet = completedSets[completedSets.length - 1];

    const defaultReps = lastSet?.reps || currentExercise?.reps_min || currentExercise?.reps || 10;
    const defaultWeight = lastSet?.weight || '';

    setSetReps(defaultReps.toString());
    setSetWeight(defaultWeight ? defaultWeight.toString() : '');
    setShowSetModal(true);
  };

  const saveSet = async () => {
    if (!currentExercise) return;

    const reps = parseInt(setReps) || (currentExercise?.reps_min || 10);
    const weight = parseFloat(setWeight) || null;
    const completedSets = getCompletedSets();
    const setNumber = completedSets.length + 1;

    try {
      const performanceId = await SessionService.logSet(
        sessionId,
        currentExercise.id,
        currentExercise.name,
        setNumber,
        reps,
        weight,
        setSeconds,
        null,
        null
      );

      // Haptic Feedback
      HapticFeedback.success();

      const newSet = {
        id: performanceId,
        set_number: setNumber,
        reps,
        weight,
        set_duration: setSeconds,
        rest_duration: null,
        completed_at: new Date().toISOString(),
      };

      const updatedSets = [...completedSets, newSet];
      const progress = exerciseProgress[currentExercise.id] || {};

      setExerciseProgress({
        ...exerciseProgress,
        [currentExercise.id]: {
          ...progress,
          sets: updatedSets,
          totalSets: updatedSets.length,
          lastSetId: performanceId,
        }
      });

      setShowSetModal(false);
      setSetReps('');
      setSetWeight('');

      if (!cumulativeRestStartTime) {
        setCumulativeRestStartTime(new Date());
      }

      setRestStartTime(new Date());
      setRestSeconds(0);
      setIsResting(true);

      // SYNC CONTEXT
      updateActiveSession({
        status: 'resting',
        startTime: new Date()
      });

      setTimeout(() => saveTimerStateToBackend(), 100);

    } catch (error) {
      console.error('Error saving set:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to save set' });
    }
  };

  const completeExercise = () => {
    if (!currentExercise) return;

    const completedSets = getCompletedSets();
    const targetSets = currentExercise.sets || 3;

    if (completedSets.length < targetSets) {
      showAlert({
        type: 'confirm',
        title: 'Mark as Complete?',
        message: `You've completed ${completedSets.length}/${targetSets} sets for ${currentExercise.name}.`,
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Mark Incomplete', onPress: () => finishExercise(false) },
          { text: 'Mark Complete', onPress: () => finishExercise(true) }
        ],
      });
    } else {
      finishExercise(true);
    }
  };

  const finishExercise = (markAsComplete) => {
    if (isSetActive && cumulativeSetStartTime) {
      const now = new Date();
      const elapsed = Math.floor((now - cumulativeSetStartTime) / 1000);
      setPausedSetSeconds(pausedSetSeconds + elapsed);
      setCumulativeSetStartTime(null);
    }

    if (isResting && cumulativeRestStartTime) {
      const now = new Date();
      const elapsed = Math.floor((now - cumulativeRestStartTime) / 1000);
      setPausedRestSeconds(pausedRestSeconds + elapsed);
      setCumulativeRestStartTime(null);
    }

    setIsSetActive(false);
    setIsResting(false);
    setSetSeconds(0);
    setRestSeconds(0);

    // Haptic Feedback
    HapticFeedback.success();

    const progress = exerciseProgress[currentExercise.id] || {};
    // Construct new progress object immediately to avoid stale state in saveTimerStateToBackend
    const newProgress = {
      ...exerciseProgress,
      [currentExercise.id]: {
        ...progress,
        completed: markAsComplete,
      }
    };

    setExerciseProgress(newProgress);

    setCurrentExercise(null);
    setCurrentExerciseStartTime(null);

    // Pass the new state explicitly to save function
    setTimeout(() => saveTimerStateToBackend(newProgress), 100);

    // FIX: Sync context to clear exercise name from banner
    updateActiveSession({
      exerciseName: null, // Clear active exercise name
      status: 'working' // Reset status to working (or could be 'finished_exercise' if supported)
    });
  };

  const finishWorkout = async () => {
    const completedCount = Object.values(exerciseProgress).filter(p => p.completed).length;
    const totalExercises = exercises.length;

    showAlert({
      type: 'confirm',
      title: 'Finish Workout',
      message: `You completed ${completedCount}/${totalExercises} exercises.\n\nEnd session?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              let finalSetDuration = pausedSetSeconds;
              let finalRestDuration = pausedRestSeconds;

              if (isSetActive && cumulativeSetStartTime) {
                const now = new Date();
                const elapsed = Math.floor((now - cumulativeSetStartTime) / 1000);
                finalSetDuration += elapsed;
              }

              if (isResting && cumulativeRestStartTime) {
                const now = new Date();
                const elapsed = Math.floor((now - cumulativeRestStartTime) / 1000);
                finalRestDuration += elapsed;
              }

              await SessionService.updateSessionDurations(
                sessionId,
                finalSetDuration,
                finalRestDuration
              );

              // Haptic Feedback
              HapticFeedback.success();

              await SessionService.endSession(sessionId);
              clearSession(); // Clear global context
              navigation.navigate('MainTabs', { screen: 'Home' });
            } catch (error) {
              console.error('Error ending session:', error);
              showAlert({ type: 'error', title: 'Error', message: 'Failed to end session' });
            }
          }
        }
      ],
    });
  };

  // === RENDER ===
  // FIX: Show loading state to prevent accidental interaction
  if (isLoading) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Restoring Session...</Text>
      </View>
    );
  }

  const completedSets = getCompletedSets();

  return (
    <View style={commonStyles.container}>
      {/* Timers Header */}
      <View style={styles.timersContainer}>
        <View style={styles.timerRow}>
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>TOTAL TIME</Text>
            <Text style={styles.timerValue}>{formatTime(totalSeconds)}</Text>
          </View>

          <View style={[styles.timerBox, isSetActive && styles.timerBoxActive]}>
            <Text style={styles.timerLabel}>SET TIME</Text>
            <Text style={[styles.timerValue, isSetActive && styles.timerValueActive]}>
              {formatTime(setSeconds)}
            </Text>
          </View>

          <View style={[styles.timerBox, isResting && styles.timerBoxRest]}>
            <Text style={styles.timerLabel}>REST TIME</Text>
            <Text style={[styles.timerValue, isResting && styles.timerValueRest]}>
              {formatTime(restSeconds)}
            </Text>
          </View>
        </View>

        <View style={styles.cumulativeRow}>
          <View style={styles.cumulativeItem}>
            <Text style={styles.cumulativeLabel}>Total Set Time:</Text>
            <Text style={styles.cumulativeValue}>
              {formatTime(totalSetSeconds)}
            </Text>
          </View>
          <View style={styles.cumulativeItem}>
            <Text style={styles.cumulativeLabel}>Total Rest Time:</Text>
            <Text style={styles.cumulativeValue}>
              {formatTime(totalRestSeconds)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {currentExercise && (
          <View style={styles.currentExerciseCard}>
            <View style={styles.currentExerciseHeader}>
              <View style={{ flex: 1 }}>
                <View style={[styles.muscleBadge, { backgroundColor: getMuscleColor(currentExercise.target_muscle) }]}>
                  <Text style={styles.muscleBadgeText}>{currentExercise.target_muscle}</Text>
                </View>

                <Text style={styles.currentExerciseName}>{currentExercise.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => navigation.navigate('ExerciseDetail', { exercise: currentExercise })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.infoButtonText}>ℹ️</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.currentExerciseTarget}>
              Target: {currentExercise.sets} sets × {currentExercise.reps_min}-{currentExercise.reps_max} reps
            </Text>

            {/* Next Set Previous Performance */}
            {lastSessionStats && (
              (() => {
                const nextSetNum = completedSets.length + 1;
                const nextSetStats = lastSessionStats.sets.find(s => s.set_number === nextSetNum);

                if (nextSetStats) {
                  return (
                    <View style={styles.nextSetStatsContainer}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.nextSetStatsLabel, { fontWeight: 'bold' }]}>
                          SET {nextSetNum} (Last Session):{' '}
                        </Text>
                        <Text style={styles.nextSetStatsValue}>
                          {nextSetStats.reps} reps {nextSetStats.weight ? `@ ${nextSetStats.weight}kg` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return null;
              })()
            )}

            <View style={styles.setsRow}>
              {Array.from({ length: currentExercise.sets || 3 }).map((_, idx) => {
                const isCompleted = idx < completedSets.length;
                return (
                  <View
                    key={idx}
                    style={[styles.setCircle, isCompleted && styles.setCircleCompleted]}
                  >
                    <Text style={[styles.setCircleText, isCompleted && styles.setCircleTextCompleted]}>
                      {idx + 1}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.setsProgressText}>
              {completedSets.length}/{currentExercise.sets} sets completed
            </Text>

            {completedSets.length > 0 && (
              <View style={styles.setsList}>
                {completedSets.map((set, idx) => (
                  <View key={idx} style={styles.setItem}>
                    <Text style={styles.setItemText}>
                      Set {set.set_number}: {set.reps} reps {set.weight ? `× ${set.weight}kg` : '(Reps Weight)'}
                      {set.set_duration && ` • ${formatTime(set.set_duration)}`}
                      {set.rest_duration && ` • Rest: ${formatTime(set.rest_duration)}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.controlButtons}>
              {!isSetActive && !isResting && (
                <GlowingButton onPress={startSet} glowColor="#F97316" style={{ width: '100%' }}>
                  🏋️  START SET
                </GlowingButton>
              )}

              {isSetActive && (
                <GlowingButton onPress={completeSet} glowColor={COLORS.success} style={{ width: '100%' }}>
                  ✅  SET COMPLETE
                </GlowingButton>
              )}

              {isResting && (
                <GlowingButton onPress={startSet} glowColor="#22C55E" style={{ width: '100%' }}>
                  💪  START NEXT SET
                </GlowingButton>
              )}

              <GlowingButton onPress={completeExercise} glowColor="#ec4899" style={{ width: '100%', marginTop: SPACING.xs }}>
                ✅  EXERCISE DONE
              </GlowingButton>
            </View>
          </View>
        )
        }

        <Text style={styles.sectionTitle}>Workout Exercises</Text>

        {
          exercises.map((exercise, index) => {
            const status = getExerciseStatus(exercise);
            const isSelected = currentExercise?.id === exercise.id;
            const progress = exerciseProgress[exercise.id];

            return (
              <TouchableOpacity
                key={exercise.id || index}
                style={[
                  styles.exerciseCard,
                  isSelected && styles.exerciseCardSelected,
                  status === 'completed' && styles.exerciseCardCompleted,
                ]}
                onPress={() => selectExercise(exercise)}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseCardContent}>
                  <View style={styles.exerciseCardHeader}>
                    <View style={[styles.statusDot,
                    status === 'completed' && styles.statusDotCompleted,
                    status === 'in_progress' && styles.statusDotInProgress,
                    ]} />
                    <Text style={[
                      styles.exerciseName,
                      status === 'completed' && styles.exerciseNameCompleted,
                    ]}>
                      {exercise.name}
                    </Text>
                  </View>

                  <Text style={styles.exerciseTarget}>
                    {exercise.sets} sets × {exercise.reps_min}-{exercise.reps_max} reps
                  </Text>

                  {progress && progress.sets && progress.sets.length > 0 && (
                    <Text style={styles.exerciseProgress}>
                      {progress.sets.length}/{exercise.sets} sets {progress.completed ? '(Complete)' : '(In Progress)'}
                    </Text>
                  )}
                </View>

                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>ACTIVE</Text>
                  </View>
                )}

                {status === 'completed' && !isSelected && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>DONE</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.infoButtonSmall}
                  onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('ExerciseDetail', { exercise: exercise });
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.infoButtonSmallText}>ℹ️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        }
      </ScrollView >

      <View style={styles.bottomBar}>
        <GlowingButton
          onPress={finishWorkout}
          glowColor="#F43F5E"
          style={{ width: '100%' }}
        >
          END WORKOUT
        </GlowingButton>
      </View>

      <Modal
        visible={showSetModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <Text style={styles.modalTitle}>Set {completedSets.length + 1} Complete</Text>

            {/* Previous Performance Display */}
            {lastSessionStats && (
              <View style={styles.previousStatsContainer}>
                <Text style={styles.previousStatsLabel}>LAST SESSION ({format(new Date(lastSessionStats.date), 'MMM d')}):</Text>
                {(() => {
                  const currentSetNum = completedSets.length + 1;
                  const prevSet = lastSessionStats.sets.find(s => s.set_number === currentSetNum);
                  if (prevSet) {
                    return (
                      <Text style={styles.previousStatsValue}>
                        {prevSet.reps} reps {prevSet.weight ? `@ ${prevSet.weight}kg` : ''}
                      </Text>
                    );
                  } else {
                    return <Text style={styles.previousStatsValue}>No data for Set {currentSetNum}</Text>;
                  }
                })()}
              </View>
            )}

            {/* End of Previous Performance Display */}

            <Text style={styles.modalSubtitle}>Set Time: {formatTime(setSeconds)}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={setReps}
                onChangeText={setSetReps}
                placeholder="Reps"
                placeholderTextColor={COLORS.textTertiary}
                selectTextOnFocus
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (kg) - Optional</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={setWeight}
                onChangeText={setSetWeight}
                placeholder="Leave blank for bodyweight"
                placeholderTextColor={COLORS.textTertiary}
                selectTextOnFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowSetModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={saveSet}
              >
                <Text style={styles.modalButtonTextPrimary}>Save & Rest</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View >
  );
}

const styles = StyleSheet.create({
  // New Loading Styles
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },

  content: {
    padding: SPACING.md,
    paddingBottom: 120,
  },

  timersContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  timerRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  timerBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  timerBoxActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successLight || COLORS.card,
  },
  timerBoxRest: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningLight || COLORS.card,
  },
  timerLabel: {
    fontSize: FONT_SIZES.xxs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.text,
  },
  timerValueActive: {
    color: COLORS.success,
  },
  timerValueRest: {
    color: COLORS.warning,
  },

  cumulativeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cumulativeItem: {
    alignItems: 'center',
  },
  cumulativeLabel: {
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  cumulativeValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accent,
  },

  currentExerciseCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 3,
    borderColor: COLORS.primaryDark,
  },
  muscleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  muscleBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },
  currentExerciseName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
    marginBottom: SPACING.xs,
  },
  currentExerciseTarget: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
    opacity: 0.8,
    marginBottom: SPACING.md,
  },

  setsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  setCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  setCircleCompleted: {
    backgroundColor: COLORS.background,
  },
  setCircleText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },
  setCircleTextCompleted: {
    color: COLORS.primary,
  },
  setsProgressText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.background,
    marginBottom: SPACING.md,
  },

  setsList: {
    marginBottom: SPACING.md,
  },
  setItem: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  setItemText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.medium,
  },

  controlButtons: {
    gap: SPACING.sm,
  },
  startSetButton: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  startSetButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  completeSetButton: {
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  completeSetButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
    letterSpacing: 1,
  },
  finishExerciseButton: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  finishExerciseButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
    letterSpacing: 1,
  },

  // Previous Set Performance Visualization
  previousStatsContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '30', // Low opacity primary
  },
  previousStatsLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  previousStatsValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },

  // Main Screen Next Set Stats
  nextSetStatsContainer: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0, 0.1)', // Slightly darken the red background
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.background,
  },
  nextSetStatsLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
    opacity: 0.9,
  },
  nextSetStatsValue: {
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
  },

  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  exerciseCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  exerciseCardCompleted: {
    opacity: 0.6,
  },
  exerciseCardContent: {
    flex: 1,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  statusDotCompleted: {
    backgroundColor: COLORS.success,
  },
  statusDotInProgress: {
    backgroundColor: COLORS.warning,
  },
  exerciseName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    flex: 1,
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  exerciseTarget: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  exerciseProgress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    marginTop: SPACING.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  selectedBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  selectedBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },
  completedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  completedBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
  },
  finishWorkoutButton: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  finishWorkoutButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
    letterSpacing: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.success,
  },
  modalButtonTextSecondary: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  modalButtonTextPrimary: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },

  // Info button styles
  currentExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  infoButtonText: {
    fontSize: 20,
  },
  infoButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoButtonSmallText: {
    fontSize: 16,
  },
});