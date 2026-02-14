import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles } from '../utils/theme';
import WorkoutPlanService from '../services/workoutPlanService';
import GlowingButton from '../components/GlowingButton';

export default function PlanSuccessScreen({ route, navigation }) {
  const { planId } = route.params;
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const planData = await WorkoutPlanService.getPlanById(planId);
      console.log('Loaded plan:', planData);
      setPlan(planData);
    } catch (error) {
      console.error('Error loading plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPlans = () => {
    navigation.navigate('MainTabs', { screen: 'Plans' });
  };

  const startWorkout = async () => {
    try {
      // Set this plan as active
      await WorkoutPlanService.setActivePlan(planId);
      navigation.navigate('MainTabs', { screen: 'Workout' });
    } catch (error) {
      console.error('Error setting active plan:', error);
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={styles.loadingText}>Loading plan...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={styles.errorText}>Failed to load plan</Text>
        <GlowingButton onPress={goToPlans} glowColor={COLORS.primary}>
          Go to Plans
        </GlowingButton>
      </View>
    );
  }

  // Use workouts array (from getPlanById)
  const workouts = plan.workouts || [];

  return (
    <View style={commonStyles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Workout Plan Created!</Text>
          <Text style={styles.successSubtitle}>Your plan is ready to go</Text>
        </View>

        {/* Plan Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.planName}>{plan.name || 'Unnamed Plan'}</Text>
          {plan.type && <Text style={styles.planType}>{plan.type}</Text>}
          {plan.description && (
            <Text style={styles.planDescription}>{plan.description}</Text>
          )}
        </View>

        {/* Workouts Summary */}
        <Text style={styles.sectionTitle}>
          {workouts.length} {workouts.length === 1 ? 'Workout' : 'Workouts'} in Rotation
        </Text>

        {workouts.map((workout, workoutIndex) => {
          const exerciseCount = workout.exercises?.length || 0;

          return (
            <View key={workoutIndex} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>Day {(workout.order || 0) + 1}</Text>
                </View>
                <Text style={styles.workoutName}>{workout.name || 'Unnamed Workout'}</Text>
              </View>

              <Text style={styles.exerciseCount}>
                {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
              </Text>

              {workout.exercises?.slice(0, 3).map((ex, exIndex) => (
                <View key={exIndex} style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>{ex.name || 'Unknown Exercise'}</Text>
                  <Text style={styles.exerciseTarget}>
                    {ex.sets || 0} × {ex.reps_min || 0}-{ex.reps_max || 0} reps
                  </Text>
                </View>
              ))}

              {exerciseCount > 3 && (
                <Text style={styles.moreText}>
                  +{exerciseCount - 3} more {exerciseCount - 3 === 1 ? 'exercise' : 'exercises'}
                </Text>
              )}
            </View>
          );
        })}

        {/* Action Buttons */}
        <GlowingButton
          onPress={startWorkout}
          glowColor={COLORS.primary}
          style={{ marginTop: SPACING.xl, marginBottom: SPACING.md }}
        >
          Start First Workout
        </GlowingButton>

        <GlowingButton
          onPress={goToPlans}
          glowColor="#22d3ee"
        >
          View My Plans
        </GlowingButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    marginBottom: SPACING.lg,
  },
  successHeader: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  planName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  planType: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  planDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  workoutCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  orderBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  orderText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
  },
  workoutName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  exerciseCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    marginBottom: SPACING.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exerciseName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
  exerciseTarget: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  moreText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },
  viewButton: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  viewButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
});