import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles, getMuscleColor } from '../utils/theme';
import { sanitizeString } from '../utils/validation'; // Added validation import
import HapticFeedback from '../utils/haptics';
import ExerciseService from '../services/exerciseService';
import { useSession } from '../context/SessionContext'; // Added import
import ActiveSessionBanner from '../components/ActiveSessionBanner';
import SkeletonLoader from '../components/SkeletonLoader';

export default function ExerciseLibraryScreen({ navigation }) {
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [muscleGroups, setMuscleGroups] = useState([]);

  const { activeSession } = useSession(); // Added activeSession destructuring

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [searchQuery, selectedFilter, exercises]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [exercisesData, muscles] = await Promise.all([
        ExerciseService.getAllExercises(),
        ExerciseService.getMuscleGroups(),
      ]);
      setExercises(exercisesData);
      setFilteredExercises(exercisesData);
      setMuscleGroups(['All', 'Favorites', ...muscles]);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = async () => {
    let filtered = exercises;

    if (selectedFilter === 'Favorites') {
      const favorites = await ExerciseService.getFavoriteExercises();
      filtered = favorites;
    } else if (selectedFilter !== 'All') {
      filtered = exercises.filter(ex => ex.target_muscle === selectedFilter);
    }

    if (searchQuery.trim()) {
      const sanitizedQuery = sanitizeString(searchQuery.toLowerCase());
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(sanitizedQuery)
      );
    }

    setFilteredExercises(filtered);
  };

  const toggleFavorite = async (exerciseId) => {
    await ExerciseService.toggleFavorite(exerciseId);
    await loadData();
  };

  const renderExerciseItem = ({ item }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => {
        HapticFeedback.light();
        navigation.navigate('ExerciseDetail', { exercise: item });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseContent}>
        {/* Muscle Badge */}
        <View style={[styles.muscleBadge, { backgroundColor: getMuscleColor(item.target_muscle) }]}>
          <Text style={styles.muscleBadgeText}>{item.target_muscle}</Text>
        </View>

        {/* Exercise Name */}
        <Text style={styles.exerciseName} numberOfLines={2}>
          {item.name}
        </Text>

        {/* Exercise Details - Properly aligned */}
        <View style={styles.exerciseMetaContainer}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Category</Text>
              <Text style={styles.metaValue}>{item.category}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Equipment</Text>
              <Text style={styles.metaValue}>{item.equipment}</Text>
            </View>
            {item.difficulty ? (
              <>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Level</Text>
                  <Text style={[styles.metaValue, styles.difficultyText]}>
                    {item.difficulty}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* Favorite Button */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          toggleFavorite(item.id);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.favoriteButton}
      >
        <View style={[styles.favoriteIcon, item.is_favorite && styles.favoriteIconActive]}>
          <Text style={styles.favoriteText}>
            {item.is_favorite ? '⭐' : '☆'}
          </Text>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[commonStyles.container, activeSession && { paddingTop: defaultPaddingTop }]}>
        <ActiveSessionBanner />

        {/* Search Bar Skeleton */}
        <View style={[
          styles.searchContainer,
          { paddingTop: activeSession ? 0 : defaultPaddingTop }
        ]}>
          <SkeletonLoader width="100%" height={50} borderRadius={BORDER_RADIUS.lg} />
        </View>

        {/* Filter Chips Skeleton */}
        <View style={{ paddingHorizontal: SPACING.md, flexDirection: 'row', marginBottom: SPACING.md }}>
          {[1, 2, 3, 4].map(i => (
            <SkeletonLoader key={i} width={80} height={36} borderRadius={BORDER_RADIUS.round} style={{ marginRight: SPACING.sm }} />
          ))}
        </View>

        {/* Exercise List Skeleton */}
        <View style={{ paddingHorizontal: SPACING.md }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={{
              marginBottom: SPACING.md,
              padding: SPACING.md,
              backgroundColor: COLORS.card,
              borderRadius: BORDER_RADIUS.lg,
              borderWidth: 1,
              borderColor: COLORS.border
            }}>
              <View style={{ flexDirection: 'row' }}>
                {/* Muscle Badge */}
                <SkeletonLoader width={80} height={24} style={{ marginBottom: SPACING.xs }} />
              </View>
              {/* Name */}
              <SkeletonLoader width="60%" height={20} style={{ marginBottom: SPACING.sm, marginTop: 4 }} />

              {/* Metadata Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <SkeletonLoader width={60} height={14} />
                <View style={{ width: 1, height: 14, marginHorizontal: SPACING.sm, backgroundColor: COLORS.border }} />
                <SkeletonLoader width={60} height={14} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const defaultPaddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : SPACING.md;

  return (
    <View style={commonStyles.container}>

      {/* Search Bar - Moved below Header if we add a Header, or we make the Header contain the Search? 
          User asked for "Title and Back Button". 
          Let's add a standard header above the Search Bar.
      */}
      <View style={styles.header}>
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
        <Text style={styles.headerTitle}>Exercises</Text>
        <View style={styles.headerButton} />
      </View>

      <ActiveSessionBanner />

      {/* Search Bar */}
      <View style={[
        styles.searchContainer,
        { paddingTop: SPACING.xs } // Reduced top padding as we have a header now
      ]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Chips - Improved alignment */}
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
              onPress={() => {
                HapticFeedback.selection();
                setSelectedFilter(item);
              }}
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

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExerciseItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
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
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  searchInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Filter Section
  filterWrapper: {
    backgroundColor: COLORS.surface,
    paddingBottom: SPACING.md,
  },
  filterContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    minWidth: 70,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
    textAlign: 'center',
    lineHeight: 16,
  },
  filterChipTextActive: {
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
  },

  // List Content
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 100, // Space for bottom nav
  },

  // Exercise Card - Improved Layout
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseContent: {
    flex: 1,
    paddingRight: SPACING.sm,
  },

  // Muscle Badge
  muscleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  muscleBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 14,
  },

  // Exercise Name
  exerciseName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },

  // Exercise Meta - Better Structure
  exerciseMetaContainer: {
    marginTop: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: 2,
    lineHeight: 12,
  },
  metaValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 16,
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.sm,
  },
  difficultyText: {
    color: COLORS.accent,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  // Favorite Button - Perfectly Aligned
  favoriteButton: {
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs,

  },
  favoriteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  favoriteIconActive: {
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    //elevation: 8,
  },
  favoriteText: {
    fontSize: 22,
    lineHeight: 24,
    textAlign: 'center',
  },

  // Empty State
  emptyContainer: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
});