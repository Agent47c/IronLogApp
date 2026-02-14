import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles } from '../utils/theme';
import WorkoutPlanService from '../services/workoutPlanService';
import { showAlert } from '../components/CustomAlertDialog';
import GlowingButton from '../components/GlowingButton';
import { sanitizeString } from '../utils/validation'; // Added validation import

// Predefined plan templates (removed 'type' field)
const PLAN_TEMPLATES = [
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    description: '3-day rotation: Push (Chest/Shoulders/Triceps), Pull (Back/Biceps), Legs',
    workouts: ['Push', 'Pull', 'Legs'],
  },
  {
    id: 'upper_lower',
    name: 'Upper Lower',
    description: '2-day rotation: Upper body and Lower body',
    workouts: ['Upper Body', 'Lower Body'],
  },
  {
    id: 'bro_split',
    name: 'Bro Split',
    description: '5-day rotation: One muscle group per day',
    workouts: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
  },
  {
    id: 'full_body',
    name: 'Full Body',
    description: 'Full body workout every session',
    workouts: ['Full Body', 'Full Body'],
  },
  {
    id: 'arnold_split',
    name: 'Arnold Split',
    description: 'Chest/Back, Shoulders/Arms, Legs - twice per week',
    workouts: ['Chest & Back', 'Shoulders & Arms', 'Legs'],
  },
  {
    id: 'custom',
    name: 'Custom Plan',
    description: 'Create your own workout rotation',
    workouts: [],
  },
];

export default function PlanBuilderScreen({ navigation, route }) {
  const { planId } = route.params || {};
  const [step, setStep] = useState(1); // 1: Template selection, 2: Configure workouts
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [customWorkoutName, setCustomWorkoutName] = useState('');

  useEffect(() => {
    if (planId) {
      loadPlan();
    }
  }, [planId]);

  // Event Emitter Listener for updates from ExerciseConfigScreen
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('workoutUpdated', (data) => {
      const { savedExercises, savedWorkoutId } = data;
      console.log('[PlanBuilder] Event received for workout:', savedWorkoutId);

      setWorkouts(prevWorkouts =>
        prevWorkouts.map(w =>
          w.id === savedWorkoutId ? { ...w, exercises: savedExercises } : w
        )
      );
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadPlan = async () => {
    try {
      const plan = await WorkoutPlanService.getPlanById(planId);
      setPlanName(plan.name || '');
      setDescription(plan.description || '');

      // Load workouts from plan
      if (plan.workouts) {
        setWorkouts(plan.workouts);
      }

      // Set as custom template since we removed type matching
      setSelectedTemplate(PLAN_TEMPLATES.find(t => t.id === 'custom'));
      setStep(2);
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setPlanName(template.name);
    setDescription(template.description);

    if (template.id === 'custom') {
      setWorkouts([]);
    } else {
      // Initialize workouts from template
      const initialWorkouts = template.workouts.map((name, index) => ({
        id: Date.now() + index,
        name,
        order: index,
        exercises: [],
      }));
      setWorkouts(initialWorkouts);
    }

    setStep(2);
  };

  const addCustomWorkout = () => {
    if (!customWorkoutName.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter a workout name' });
      return;
    }

    const newWorkout = {
      id: Date.now(),
      name: customWorkoutName,
      order: workouts.length,
      exercises: [],
    };

    setWorkouts([...workouts, newWorkout]);
    setCustomWorkoutName('');
  };

  const removeWorkout = (workoutId) => {
    showAlert({
      type: 'destructive',
      title: 'Remove Workout',
      message: 'Are you sure you want to remove this workout?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setWorkouts(workouts.filter(w => w.id !== workoutId));
          },
        },
      ],
    });
  };

  const openWorkoutConfig = (workout) => {
    navigation.navigate('ExerciseConfig', {
      planId,
      workoutId: workout.id,
      workoutName: workout.name,
      currentExercises: workout.exercises || [],
      sourceKey: route.key,
    });
  };

  const editExerciseInWorkout = (workout, exerciseIndex) => {
    const exercise = workout.exercises[exerciseIndex];

    navigation.navigate('ExerciseConfig', {
      planId,
      workoutId: workout.id,
      workoutName: workout.name,
      editMode: true,
      editIndex: exerciseIndex,
      exerciseToEdit: exercise,
      exerciseToEdit: exercise,
      currentExercises: workout.exercises || [],
      sourceKey: route.key,
    });
  };

  const removeExerciseFromWorkout = (workoutId, exerciseIndex) => {
    showAlert({
      type: 'destructive',
      title: 'Remove Exercise',
      message: 'Are you sure you want to remove this exercise?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setWorkouts(prevWorkouts =>
              prevWorkouts.map(w => {
                if (w.id === workoutId) {
                  const newExercises = [...w.exercises];
                  newExercises.splice(exerciseIndex, 1);
                  return { ...w, exercises: newExercises };
                }
                return w;
              })
            );
          },
        },
      ],
    });
  };

  const savePlan = async () => {
    if (!planName.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter a plan name' });
      return;
    }

    if (workouts.length === 0) {
      showAlert({ type: 'error', title: 'Error', message: 'Please add at least one workout to your rotation' });
      return;
    }

    // Check if all workouts have exercises
    for (const workout of workouts) {
      if (!workout.exercises || workout.exercises.length === 0) {
        showAlert({ type: 'error', title: 'Error', message: `"${workout.name}" has no exercises. Please add exercises or remove this workout.` });
        return;
      }
    }

    try {
      const planData = {
        name: sanitizeString(planName),
        description: sanitizeString(description),
        workouts: workouts.map((w, index) => ({
          name: sanitizeString(w.name),
          order: index,
          exercises: w.exercises,
        })),
      };

      let savedPlanId;
      if (planId) {
        await WorkoutPlanService.updatePlan(planId, planData);
        savedPlanId = planId;
      } else {
        savedPlanId = await WorkoutPlanService.createPlan(planData);
      }

      navigation.navigate('PlanSuccess', { planId: savedPlanId });
    } catch (error) {
      console.error('Error saving plan:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to save plan' });
    }
  };

  const renderWorkoutCard = (workout) => {
    const exercises = workout.exercises || [];

    return (
      <View key={workout.id} style={styles.workoutCard}>
        <View style={styles.workoutHeader}>
          <View style={styles.workoutHeaderLeft}>
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>Day {workout.order + 1}</Text>
            </View>
            <Text style={styles.workoutName}>{workout.name}</Text>
          </View>
          {selectedTemplate?.id === 'custom' && (
            <TouchableOpacity
              onPress={() => removeWorkout(workout.id)}
              style={styles.removeWorkoutButton}
            >
              <Text style={styles.removeWorkoutText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.workoutContent}>
          {exercises.length > 0 ? (
            <>
              {exercises.map((exercise, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.exerciseItem}
                  onPress={() => editExerciseInWorkout(workout, index)}
                  onLongPress={() => removeExerciseFromWorkout(workout.id, index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets} sets × {exercise.reps_min}-{exercise.reps_max} reps
                    </Text>
                  </View>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <Text style={styles.noExercises}>No exercises added</Text>
          )}

          <GlowingButton
            onPress={() => openWorkoutConfig(workout)}
            glowColor={COLORS.primary}
            style={{ height: 44, marginTop: SPACING.sm }}
          >
            + Add Exercises
          </GlowingButton>
        </View>
      </View>
    );
  };

  // Step 1: Template Selection
  if (step === 1) {
    return (
      <View style={commonStyles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Choose Your Plan Type</Text>
          <Text style={styles.pageSubtitle}>
            Select a template or create a custom rotation-based plan
          </Text>

          {PLAN_TEMPLATES.map(template => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => selectTemplate(template)}
              activeOpacity={0.7}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{template.name}</Text>
                {template.workouts.length > 0 && (
                  <View style={styles.workoutCountBadge}>
                    <Text style={styles.workoutCountText}>
                      {template.workouts.length} {template.workouts.length === 1 ? 'workout' : 'workouts'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.templateDescription}>{template.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Step 2: Configure Workouts
  return (
    <View style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Plan Name"
            placeholderTextColor={COLORS.textTertiary}
            value={planName}
            onChangeText={setPlanName}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor={COLORS.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Workout Rotation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Rotation</Text>
          <Text style={styles.sectionSubtitle}>
            Your workouts will cycle in this order. If you skip a day, the next workout continues the rotation.
          </Text>

          {selectedTemplate?.id === 'custom' && (
            <View style={styles.addCustomWorkout}>
              <TextInput
                style={[styles.input, styles.customWorkoutInput]}
                placeholder="Workout name (e.g., Push Day)"
                placeholderTextColor={COLORS.textTertiary}
                value={customWorkoutName}
                onChangeText={setCustomWorkoutName}
              />
              <GlowingButton
                onPress={addCustomWorkout}
                glowColor={COLORS.primary}
                style={{ height: 44, paddingHorizontal: SPACING.lg }}
              >
                Add
              </GlowingButton>
            </View>
          )}

          {workouts.map(workout => renderWorkoutCard(workout))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonRow}>
          <GlowingButton
            onPress={() => setStep(1)}
            glowColor="#22d3ee"
            style={{ flex: 1, height: 52 }}
          >
            ← Change Plan
          </GlowingButton>

          <View style={{ width: SPACING.md }} />

          <GlowingButton
            onPress={savePlan}
            glowColor={COLORS.primary}
            style={{ flex: 1, height: 52 }}
          >
            {planId ? 'Update Plan' : 'Create Plan'}
          </GlowingButton>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  templateCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  templateName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    lineHeight: 24,
  },
  workoutCountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  workoutCountText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 14,
  },
  templateDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addCustomWorkout: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  customWorkoutInput: {
    flex: 1,
    marginRight: SPACING.sm,
    marginBottom: 0,
  },
  addCustomButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  addCustomButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
    lineHeight: 18,
  },
  workoutCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '15',
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    lineHeight: 14,
  },
  workoutName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    flex: 1,
    lineHeight: 22,
  },
  removeWorkoutButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeWorkoutText: {
    fontSize: 18,
    color: COLORS.error,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 18,
  },
  workoutContent: {
    padding: SPACING.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  exerciseDetails: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  editIcon: {
    fontSize: 20,
    marginLeft: SPACING.sm,
  },
  noExercises: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    padding: SPACING.md,
    lineHeight: 18,
  },
  addExerciseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  addExerciseText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  backButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
    lineHeight: 22,
  },
});