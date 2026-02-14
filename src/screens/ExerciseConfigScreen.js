import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  StatusBar,
  LayoutAnimation,
  KeyboardAvoidingView,
  DeviceEventEmitter,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles, getMuscleColor } from '../utils/theme';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ExerciseService from '../services/exerciseService';
import { showAlert } from '../components/CustomAlertDialog';
import GlowingButton from '../components/GlowingButton';
import SkeletonLoader from '../components/SkeletonLoader';

// Memoized Exercise Item Component
const ExerciseItem = React.memo(({ item, onSelect, navigation }) => (
  <TouchableOpacity
    style={styles.exerciseCard}
    onPress={() => onSelect(item)}
    activeOpacity={0.7}
  >
    <View style={[styles.muscleBadge, { backgroundColor: getMuscleColor(item.target_muscle) }]}>
      <Text style={styles.muscleBadgeText}>{item.target_muscle}</Text>
    </View>
    <View style={styles.exerciseInfo}>
      <Text style={styles.exerciseName}>{item.name}</Text>
      <Text style={styles.exerciseEquipment}>{item.equipment}</Text>
    </View>
    <TouchableOpacity
      onPress={() => navigation.push('ExerciseDetail', { exercise: item })}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.infoButton}
    >
      <Ionicons name="information-circle-outline" size={22} color={COLORS.textSecondary} />
    </TouchableOpacity>
    <Text style={styles.addIcon}>+</Text>
  </TouchableOpacity>
));

// 1. Static Header (Title, Save, Accordion)
const ConfigHeader = React.memo(({
  editMode,
  workoutName,
  configuredExercises,
  saveConfiguration,
  showExerciseList,
  toggleConfigList,
  isConfigListExpanded,
  navigation,
  removeConfiguredExercise,
}) => (
  <View style={styles.headerContainer}>
    <Text style={styles.pageTitle}>
      {editMode ? 'Edit Exercise Configuration' : `Configure Exercises for ${workoutName}`}
    </Text>

    {/* Save Button */}
    {configuredExercises.length > 0 && (
      <GlowingButton
        onPress={saveConfiguration}
        glowColor={COLORS.primary}
        style={{ marginTop: SPACING.sm, marginBottom: SPACING.sm }}
      >
        ✓ Save {configuredExercises.length} Exercise{configuredExercises.length !== 1 ? 's' : ''} to {workoutName}
      </GlowingButton>
    )}

    {/* Configured Exercises Accordion */}
    {configuredExercises.length > 0 && showExerciseList && (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={toggleConfigList}
          activeOpacity={0.7}
        >
          <Text style={styles.accordionTitle}>
            Configured Exercises ({configuredExercises.length})
          </Text>
          <Text style={styles.accordionIcon}>
            {isConfigListExpanded ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        <View style={{ overflow: 'hidden', height: isConfigListExpanded ? 'auto' : 0 }}>
          <View style={styles.accordionContent}>
            {configuredExercises.map((ex, index) => (
              <Animated.View
                key={ex._listingId || index}
                entering={FadeIn}
                exiting={FadeOut}
                layout={LinearTransition}
                style={styles.configuredItem}
              >
                <View style={styles.configuredInfo}>
                  <Text style={styles.configuredName}>{ex.name}</Text>
                  <Text style={styles.configuredDetails}>
                    {ex.sets} sets × {ex.reps_min}-{ex.reps_max} reps
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.push('ExerciseDetail', { exercise: ex })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.infoButton}
                >
                  <Ionicons name="information-circle-outline" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeConfiguredExercise(index)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    )}
  </View>
));

// 2. Search & Filter Section (Sibling to FlatList)
const SearchSection = React.memo(({
  searchQuery,
  setSearchQuery,
  muscleGroups,
  selectedFilter,
  setSelectedFilter,
}) => (
  <View style={styles.searchFixedContainer}>
    <Text style={styles.sectionTitle}>Select Exercise to Add</Text>

    {/* Search Bar */}
    <TextInput
      style={styles.searchInput}
      placeholder="Search exercises..."
      placeholderTextColor={COLORS.textTertiary}
      value={searchQuery}
      onChangeText={setSearchQuery}
    />

    {/* Filter Chips */}
    <View style={styles.filterWrapper}>
      <FlatList
        horizontal
        data={muscleGroups}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === item && styles.filterChipActive
            ]}
            onPress={() => setSelectedFilter(item)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterChipText,
              selectedFilter === item && styles.filterChipTextActive
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  </View>
));

// 3. Configuration Form (Separate View)
const ConfigForm = React.memo(({
  selectedExercise,
  navigation,
  setSelectedExercise,
  setShowExerciseList,
  setSearchQuery,
  sets,
  setSets,
  repsMin,
  setRepsMin,
  repsMax,
  setRepsMax,
  restSeconds,
  setRestSeconds,
  validateAndAddExercise,
  editMode,
}) => (
  <ScrollView contentContainerStyle={styles.scrollContent}>
    <View style={styles.section}>
      <View style={styles.selectedExerciseHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={styles.sectionTitle}>Configure: {selectedExercise?.name}</Text>
          <TouchableOpacity
            onPress={() => navigation.push('ExerciseDetail', { exercise: selectedExercise })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: SPACING.xs, padding: 4 }}
          >
            <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedExercise(null);
            setShowExerciseList(true);
            setSearchQuery('');
          }}
          style={styles.changeButton}
        >
          <Text style={styles.changeButtonText}>CHANGE EXERCISE</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.configForm}>
        <Text style={styles.label}>Number of Sets *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 3"
          placeholderTextColor={COLORS.textTertiary}
          value={sets}
          onChangeText={setSets}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Reps Range *</Text>
        <View style={styles.rangeContainer}>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>Min</Text>
            <TextInput
              style={styles.rangeInput}
              placeholder="8"
              placeholderTextColor={COLORS.textTertiary}
              value={repsMin}
              onChangeText={setRepsMin}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.rangeSeparatorWrapper}>
            <Text style={styles.rangeSeparator}>to</Text>
          </View>

          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>Max</Text>
            <TextInput
              style={styles.rangeInput}
              placeholder="12"
              placeholderTextColor={COLORS.textTertiary}
              value={repsMax}
              onChangeText={setRepsMax}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Text style={styles.helperText}>
          Max reps must be greater than min reps
        </Text>

        <Text style={styles.label}>Rest Time (seconds)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 60"
          placeholderTextColor={COLORS.textTertiary}
          value={restSeconds}
          onChangeText={setRestSeconds}
          keyboardType="number-pad"
        />

        <GlowingButton
          onPress={validateAndAddExercise}
          glowColor="#22d3ee"
          style={{ marginTop: SPACING.sm }}
        >
          {editMode ? '✓ Update Exercise' : '+ Add Exercise'}
        </GlowingButton>
      </View>
    </View>
  </ScrollView>
));

export default function ExerciseConfigScreen({ navigation, route }) {
  const {
    workoutName,
    workoutId,
    currentExercises = [],
    editMode = false,
    editIndex = -1,
    exerciseToEdit = null,
    sourceKey = null,
  } = route.params || {};

  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [sets, setSets] = useState('');
  const [repsMin, setRepsMin] = useState('');
  const [repsMax, setRepsMax] = useState('');
  const [restSeconds, setRestSeconds] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [muscleGroups, setMuscleGroups] = useState([]);

  // UI State
  const [configuredExercises, setConfiguredExercises] = useState([]);
  const [showExerciseList, setShowExerciseList] = useState(!editMode);
  const [isConfigListExpanded, setIsConfigListExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Reset state when entering for a new workout or fresh edit
  useEffect(() => {
    if (editMode && exerciseToEdit) {
      setSelectedExercise(exerciseToEdit);
      setSets(exerciseToEdit.sets?.toString() || '');
      setRepsMin(exerciseToEdit.reps_min?.toString() || exerciseToEdit.reps?.toString() || '');
      setRepsMax(exerciseToEdit.reps_max?.toString() || exerciseToEdit.reps?.toString() || '');
      setRestSeconds(exerciseToEdit.rest_seconds?.toString() || '');
      setShowExerciseList(false);
    } else {
      // If not edit mode, or if workoutId changed, verify we are clean
      // But we should respecting currentExercises passed in params if functionality implies re-opening to add more.
      // However, the issue is STALE data from a DIFFERENT workout.
      // So we sync configuredExercises with currentExercises from params.
      setConfiguredExercises(currentExercises || []);
      setSelectedExercise(null);
      setSets('');
      setRepsMin('');
      setRepsMax('');
      setRestSeconds('');
      setShowExerciseList(true);
      setIsConfigListExpanded(false);
    }
  }, [workoutId, editMode, exerciseToEdit?._listingId, sourceKey]);

  useEffect(() => {
    filterExercises();
  }, [searchQuery, selectedFilter, exercises]);

  // Intercept back button
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (selectedExercise) {
        e.preventDefault();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedExercise(null);
        setShowExerciseList(true);
        setSets('');
        setRepsMin('');
        setRepsMax('');
        setRestSeconds('');
      }
    });

    return unsubscribe;
  }, [navigation, selectedExercise]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allExercises, muscles] = await Promise.all([
        ExerciseService.getAllExercises(),
        ExerciseService.getMuscleGroups(),
      ]);
      setExercises(allExercises);
      setFilteredExercises(allExercises);
      setMuscleGroups(['All', ...muscles]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = exercises;
    if (selectedFilter !== 'All') {
      filtered = filtered.filter(ex => ex.target_muscle === selectedFilter);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredExercises(filtered);
  };

  const selectExercise = React.useCallback((exercise) => {
    // Check for duplicates
    const isDuplicate = configuredExercises.some(ex => ex.name === exercise.name);

    if (isDuplicate) {
      showAlert({
        type: 'warning',
        title: 'Duplicate Exercise',
        message: 'This exercise is already available on this day, choose another exercise.',
      });
      return;
    }

    // LayoutAnimation removed to prevent UI jumpiness/black screen glitch
    setSelectedExercise(exercise);
    setShowExerciseList(false);
    setSets('');
    setRepsMin('');
    setRepsMax('');
    setRestSeconds('');
  }, [configuredExercises]);

  const toggleConfigList = () => {
    // LayoutAnimation removed
    setIsConfigListExpanded(!isConfigListExpanded);
  };

  const validateAndAddExercise = () => {
    if (!selectedExercise) {
      showAlert({ type: 'error', title: 'Error', message: 'Please select an exercise' });
      return;
    }
    if (!sets || parseInt(sets) < 1) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter a valid number of sets (minimum 1)' });
      return;
    }
    const minReps = parseInt(repsMin);
    const maxReps = parseInt(repsMax);
    if (!repsMin || minReps < 1) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter a valid minimum reps (minimum 1)' });
      return;
    }
    if (!repsMax || maxReps < 1) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter a valid maximum reps (minimum 1)' });
      return;
    }
    if (maxReps <= minReps) {
      showAlert({
        type: 'warning',
        title: 'Invalid Range',
        message: `Maximum reps (${maxReps}) must be greater than minimum reps (${minReps})`,
      });
      return;
    }

    const exerciseConfig = {
      id: selectedExercise.id,
      name: selectedExercise.name,
      target_muscle: selectedExercise.target_muscle,
      equipment: selectedExercise.equipment,
      sets: parseInt(sets),
      reps_min: minReps,
      reps_max: maxReps,
      reps: minReps,
      rest_seconds: restSeconds ? parseInt(restSeconds) : null,
      _listingId: Math.random().toString(),
    };

    let updatedExercises;
    if (editMode && editIndex >= 0) {
      updatedExercises = [...configuredExercises];
      updatedExercises[editIndex] = exerciseConfig;
    } else {
      updatedExercises = [...configuredExercises, exerciseConfig];
    }

    setConfiguredExercises(updatedExercises);
    // Reset form
    setSelectedExercise(null);
    setSets('');
    setRepsMin('');
    setRepsMax('');
    setRestSeconds('');
    setShowExerciseList(true);
    setSearchQuery('');
    setSelectedFilter('All');
    setIsConfigListExpanded(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert({
      type: 'success',
      title: 'Success',
      message: editMode ? 'Exercise updated! You can save now.' : 'Exercise added! Add more or save.',
    });
  };

  const removeConfiguredExercise = (index) => {
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
            const updated = [...configuredExercises];
            updated.splice(index, 1);
            setConfiguredExercises(updated);
          },
        },
      ],
    });
  };

  const saveConfiguration = () => {
    if (configuredExercises.length === 0) {
      showAlert({ type: 'error', title: 'Error', message: 'Please add at least one exercise' });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    console.log('[ExerciseConfig] Emitting update event and going back');

    // Emit event to update PlanBuilder state
    DeviceEventEmitter.emit('workoutUpdated', {
      savedExercises: configuredExercises,
      savedWorkoutId: workoutId,
      _timestamp: Date.now(),
    });

    // Simply go back to the existing screen
    navigation.goBack();
  };

  const renderExerciseItem = React.useCallback(({ item }) => (
    <ExerciseItem item={item} onSelect={selectExercise} navigation={navigation} />
  ), [selectExercise, navigation]);


  return (
    <View style={commonStyles.container}>
      {/* 1. Header & List (Always Rendered underneath) */}
      <View style={{ flex: 1 }}>
        <ConfigHeader
          editMode={editMode}
          workoutName={workoutName}
          configuredExercises={configuredExercises}
          saveConfiguration={saveConfiguration}
          showExerciseList={showExerciseList}
          toggleConfigList={toggleConfigList}
          isConfigListExpanded={isConfigListExpanded}
          navigation={navigation}
          removeConfiguredExercise={removeConfiguredExercise}
        />

        <View style={{ flex: 1 }}>
          <SearchSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            muscleGroups={muscleGroups}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
          />

          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              isLoading ? (
                <View style={{ padding: SPACING.md }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonLoader
                      key={i}
                      height={72}
                      style={{ marginBottom: SPACING.sm }}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No exercises found</Text>
                </View>
              )
            }
          />
        </View>
      </View>

      {/* 2. CONFIGURATION OVERLAY (Absolute Position) */}
      {!showExerciseList && (
        <View style={[StyleSheet.absoluteFill, styles.overlayContainer]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ConfigForm
              selectedExercise={selectedExercise}
              navigation={navigation}
              setSelectedExercise={setSelectedExercise}
              setShowExerciseList={setShowExerciseList}
              setSearchQuery={setSearchQuery}
              sets={sets}
              setSets={setSets}
              repsMin={repsMin}
              setRepsMin={setRepsMin}
              repsMax={repsMax}
              setRepsMax={setRepsMax}
              restSeconds={restSeconds}
              setRestSeconds={setRestSeconds}
              validateAndAddExercise={validateAndAddExercise}
              editMode={editMode}
            />
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.md : SPACING.md,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  overlayContainer: {
    backgroundColor: COLORS.background,
    zIndex: 20, // Sit on top of header
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0, // Ensure status bar clearance
  },
  searchFixedContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingTop: 0, // Padding handled by containers now
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    lineHeight: 28,
  },
  saveButtonTop: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs, // Reduced to bring button closer
    lineHeight: 24,
  },

  // Accordion Styles
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accordionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  accordionIcon: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  accordionContent: {
    marginTop: SPACING.sm,
    paddingLeft: SPACING.xs,
  },

  // Search & Filter
  selectionContainer: {
    marginBottom: SPACING.lg,
  },
  searchInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterWrapper: {
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.md,
  },
  filterContainer: {
    paddingHorizontal: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 4,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  filterChipTextActive: {
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
  },

  // Exercise Items
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  muscleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.md,
    minWidth: 80,
    alignItems: 'center',
  },
  muscleBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  exerciseEquipment: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  addIcon: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    marginLeft: SPACING.sm,
  },
  infoButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },

  // Configured Items
  configuredItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  configuredInfo: {
    flex: 1,
  },
  configuredName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  configuredDetails: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  removeText: {
    fontSize: 18,
    color: COLORS.error,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 18,
  },

  // Config Form
  selectedExerciseHeader: {
    // FIX: Changed from row to column to stack title and button
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  changeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    marginTop: SPACING.xs, // Add space above button
  },
  changeButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: 'uppercase',
  },
  configForm: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  rangeInputWrapper: {
    flex: 1,
  },
  rangeSeparatorWrapper: {
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  rangeInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    textAlign: 'center',
  },
  rangeSeparator: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
    marginTop: SPACING.sm,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },
  emptyContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
});