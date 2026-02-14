import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles } from '../utils/theme';
import SessionService from '../services/sessionService';
import WorkoutPlanService from '../services/workoutPlanService'; // Added import
import { useSession } from '../context/SessionContext'; // Added import
import ActiveSessionBanner from '../components/ActiveSessionBanner';
import SkeletonLoader from '../components/SkeletonLoader';

export default function HistoryScreen({ navigation }) {
  const { activeSession } = useSession(); // Added activeSession destructuring
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState({});
  const [sortBy, setSortBy] = useState('date'); // 'date', 'time', 'workout', 'duration'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadSessions = async () => {
    try {
      setLoading(true);
      const [sessionsData, plansData] = await Promise.all([
        SessionService.getAllSessions(100), // Increased limit for better history view
        WorkoutPlanService.getAllPlans()
      ]);

      // Create plan map
      const planMap = {};
      plansData.forEach(p => planMap[p.id] = p.name);
      setPlans(planMap);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (criteria) => {
    if (sortBy === criteria) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(criteria);
      setSortOrder('desc'); // Default to newest/highest when switching
    }
  };

  const getSortedSessions = () => {
    const sorted = [...sessions].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.session_date) - new Date(b.session_date);
          break;
        case 'time':
          // Compare times only, ignoring date components if feasible, 
          // or just compare full timestamps if "Time" implies chronological order.
          // Request said "Time", usually implies time of day.
          const dateA = new Date(a.check_in_time);
          const dateB = new Date(b.check_in_time);
          // Compare hours and minutes
          const timeA = dateA.getHours() * 60 + dateA.getMinutes();
          const timeB = dateB.getHours() * 60 + dateB.getMinutes();
          comparison = timeA - timeB;
          break;
        case 'workout':
          const nameA = plans[a.plan_id] || 'Custom Workout';
          const nameB = plans[b.plan_id] || 'Custom Workout';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'duration':
          comparison = (a.total_duration || 0) - (b.total_duration || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const renderSession = ({ item }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
    >
      <View style={styles.sessionHeader} >
        <Text style={styles.sessionDate}>{format(new Date(item.session_date), 'MMM dd, yyyy')}</Text>
        <Text style={styles.sessionDuration}>{item.total_duration || 0} min</Text>
      </View>
      <Text style={styles.sessionTime}>{format(new Date(item.check_in_time), 'h:mm a')}</Text>
    </TouchableOpacity>
  );

  const defaultPaddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : SPACING.md;

  const SortChip = ({ label, criteria }) => (
    <TouchableOpacity
      style={[
        styles.sortChip,
        sortBy === criteria && styles.sortChipActive
      ]}
      onPress={() => toggleSort(criteria)}
    >
      <Text style={[
        styles.sortChipText,
        sortBy === criteria && styles.sortChipTextActive
      ]}>
        {label}
        {sortBy === criteria ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={commonStyles.container}>
      {/* Custom Header for History Screen */}
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

        <Text style={styles.headerTitle}>History</Text>

        <View style={styles.headerButton} />
      </View>

      <ActiveSessionBanner />

      {/* Sorting Controls */}
      <View style={styles.sortContainer}>
        <SortChip label="Date" criteria="date" />
        <SortChip label="Time" criteria="time" />
        <SortChip label="Workout" criteria="workout" />
        <SortChip label="Duration" criteria="duration" />
      </View>

      {loading ? (
        <View style={styles.listContent}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <SkeletonLoader width={100} height={20} />
                <SkeletonLoader width={60} height={20} />
              </View>
              <SkeletonLoader width={80} height={14} style={{ marginTop: SPACING.xs }} />
            </View>
          ))}
        </View>
      ) : (

        <FlatList
          data={getSortedSessions()}
          renderItem={renderSession}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: 0 } // Remove top padding from list since we have sort controls now
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No workout history yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.md,
    // Remove duplication of StatusBar logic since we have a header now
    paddingBottom: SPACING.xxl + 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.sm : SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start', // Back button aligns left
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  sessionCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sessionDate: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  sessionDuration: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },
  sessionTime: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  empty: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },

  // Sorting Styles
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm, // Add some top padding below banner
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sortChipTextActive: {
    color: COLORS.background,
  },
});