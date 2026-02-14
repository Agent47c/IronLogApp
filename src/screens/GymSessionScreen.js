import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,   // Added
  StatusBar   // Added
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles, getMuscleColor } from '../utils/theme';
import SessionService from '../services/sessionService';
import WorkoutPlanService from '../services/workoutPlanService';
import { showAlert } from '../components/CustomAlertDialog';
import GlowingButton from '../components/GlowingButton';
import { useSession } from '../context/SessionContext';


export default function GymSessionScreen({ navigation }) {
  const { activeSession, checkActiveSession } = useSession();
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        checkActiveSession(),
        (async () => {
          const plan = await WorkoutPlanService.getActivePlan();
          setActivePlan(plan);
        })()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = async (workout) => {
    try {
      if (!activePlan) {
        showAlert({ type: 'warning', title: 'No Active Plan', message: 'Please set a workout plan as active first.' });
        return;
      }

      // Start session with plan and day/workout ID
      const sessionId = await SessionService.startSession(activePlan.id, workout.id);

      // Force update context so banner appears immediately
      await checkActiveSession();

      // Navigate to session tracker
      navigation.navigate('SessionTracker', {
        sessionId,
        planId: activePlan.id,
        workoutId: workout.id,
        workoutName: workout.name,
        exercises: workout.exercises
      });
    } catch (error) {
      console.error('Error starting workout:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to start workout session' });
    }
  };

  const continueSession = () => {
    if (activeSession) {
      navigation.navigate('SessionTracker', {
        sessionId: activeSession.id,
        planId: activeSession.plan_id,
        workoutId: activeSession.day_id
      });
    }
  };



  if (activeSession) {
    return (
      <View style={[commonStyles.container, styles.center]}>
        <View style={styles.activeSessionContainer}>
          <View style={styles.pulseCircle} />
          <Text style={styles.activeIcon}>LIVE</Text>
          <Text style={styles.activeTitle}>Workout in Progress</Text>
          <Text style={styles.activeSubtitle}>You have an active workout session</Text>

          <GlowingButton
            onPress={() => {
              navigation.navigate('SessionTracker', {
                sessionId: activeSession.sessionId,
                planId: activeSession.planId,
                workoutId: activeSession.workoutId,
              });
            }}
            glowColor={COLORS.primary}
            style={{ width: '100%', height: 56, marginBottom: SPACING.md }}
            textStyle={{ fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold }}
          >
            Continue Workout
          </GlowingButton>
        </View>
      </View>
    );
  }

  // No active plan
  if (!activePlan) {
    return (
      <View style={[commonStyles.container, styles.center]}>
        <Text style={styles.emptyIcon}>PLAN</Text>
        <Text style={styles.emptyTitle}>No Active Plan</Text>
        <Text style={styles.emptySubtitle}>Set a workout plan as active to start</Text>
        <GlowingButton
          onPress={() => navigation.navigate('Plans')}
          glowColor={COLORS.primary}
        >
          View My Plans
        </GlowingButton>
      </View>
    );
  }

  // Show workout selection
  const workouts = activePlan.workouts || activePlan.workout_days || [];

  return (
    <View style={commonStyles.container}>
      {/* Standard Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Helper Header inside scroll is redundant for Title, but good for Plan Name */}
        <View style={styles.subHeader}>
          <Text style={styles.planNameLabel}>Active Plan:</Text>
          <Text style={styles.planName}>{activePlan.name}</Text>
        </View>

        {/* Workout Days/Rotations */}
        <Text style={styles.sectionLabel}>Select Workout Day</Text>

        {workouts.map((workout, index) => {
          const exerciseCount = workout.exercises?.length || 0;
          const muscleGroups = [...new Set(workout.exercises?.map(e => e.target_muscle) || [])];

          return (
            <TouchableOpacity
              key={workout.id || index}
              style={styles.workoutCard}
              onPress={() => startWorkout(workout)}
              activeOpacity={0.7}
            >
              <View style={styles.workoutHeader}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Day {(workout.order || 0) + 1}</Text>
                </View>
                <Text style={styles.workoutName}>{workout.name || `Workout ${index + 1}`}</Text>
              </View>

              <Text style={styles.exerciseCount}>
                {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
              </Text>

              {/* Muscle Groups */}
              {muscleGroups.length > 0 && (
                <View style={styles.muscleTagsContainer}>
                  {muscleGroups.slice(0, 3).map((muscle, idx) => (
                    <View
                      key={idx}
                      style={[styles.muscleTag, { backgroundColor: getMuscleColor(muscle) }]}
                    >
                      <Text style={styles.muscleTagText}>{muscle}</Text>
                    </View>
                  ))}
                  {muscleGroups.length > 3 && (
                    <View style={styles.moreTag}>
                      <Text style={styles.moreTagText}>+{muscleGroups.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Start Button */}
              <GlowingButton
                onPress={() => startWorkout(workout)}
                glowColor={COLORS.primary}
                style={{ width: '100%', height: 44, marginTop: SPACING.sm }}
              >
                START
              </GlowingButton>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.md : SPACING.md,
    paddingBottom: SPACING.xxl + 60,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },

  // Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.sm : SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  subHeader: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  planNameLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  planName: {
    fontSize: FONT_SIZES.xl, // Increased size
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold, // Bold
  },

  sectionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Active Session
  activeSessionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
    position: 'absolute',
    top: -30,
  },
  activeIcon: {
    fontSize: FONT_SIZES.huge,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.primary,
    marginBottom: SPACING.md,
    letterSpacing: 4,
  },
  activeTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  activeSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },

  // Empty State
  emptyIcon: {
    fontSize: FONT_SIZES.massive,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
    letterSpacing: 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  goToPlansButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  goToPlansText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },

  // Workout Cards
  workoutCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dayBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  dayBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },
  workoutName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    flex: 1,
  },
  exerciseCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  muscleTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  muscleTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  muscleTagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },
  moreTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.elevated,
  },
  moreTagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  startButtonContainer: {
    alignItems: 'flex-end',
    marginTop: SPACING.xs,
  },
  startArrow: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    letterSpacing: 2,
  },
});