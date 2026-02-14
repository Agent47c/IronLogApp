import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles } from '../utils/theme';
import SessionService from '../services/sessionService';
import { showAlert } from '../components/CustomAlertDialog';
import GlowingButton from '../components/GlowingButton';

export default function SessionDetailScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadSessionDetails();
    }, [sessionId])
  );

  const loadSessionDetails = async () => {
    try {
      setLoading(true);
      const data = await SessionService.getSessionById(sessionId);
      setSession(data);
    } catch (error) {
      console.error('Error loading session details:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to load session details' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = () => {
    showAlert({
      type: 'destructive',
      title: 'Delete Log',
      message: 'Are you sure? This workout data will be permanently removed.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await SessionService.deleteSession(sessionId);
            navigation.goBack();
          },
        },
      ],
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) return null;

  // Data Calculations
  const sessionDate = new Date(session.session_date);
  const startTime = new Date(session.check_in_time);
  const endTime = session.check_out_time ? new Date(session.check_out_time) : null;

  // Calculate Work/Rest Ratio
  const totalRecordedTime = (session.total_set_duration || 0) + (session.total_rest_duration || 0);
  const workPercentage = totalRecordedTime > 0
    ? Math.round((session.total_set_duration / totalRecordedTime) * 100)
    : 0;

  // Calculate Volume
  const totalVolume = session.exercises
    ? session.exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((sub, set) => sub + ((set.weight || 0) * (set.reps || 0)), 0);
    }, 0)
    : 0;

  return (
    <View style={commonStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* === TITLE HEADER === */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{format(sessionDate, 'EEEE, MMM do')}</Text>
          <Text style={styles.pageTitle}>Workout Summary</Text>
        </View>

        {/* === TIMELINE CARD (Interactive Look) === */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineRow}>
            <View style={styles.timePoint}>
              <Text style={styles.timeLabel}>STARTED</Text>
              <Text style={styles.timeValue}>{format(startTime, 'h:mm a')}</Text>
            </View>

            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{session.total_duration || 0} min</Text>
              <View style={styles.durationLine} />
            </View>

            <View style={[styles.timePoint, { alignItems: 'flex-end' }]}>
              <Text style={styles.timeLabel}>FINISHED</Text>
              <Text style={styles.timeValue}>
                {endTime ? format(endTime, 'h:mm a') : 'Now'}
              </Text>
            </View>
          </View>
        </View>

        {/* === FOCUS BREAKDOWN (Lift vs Rest) === */}
        <Text style={styles.sectionTitle}>Focus Breakdown</Text>
        <View style={styles.focusCard}>
          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${workPercentage}%` }]} />
          </View>

          <View style={styles.focusStatsRow}>
            <View style={styles.focusStat}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <View>
                <Text style={styles.focusValue}>{formatDuration(session.total_set_duration)}</Text>
                <Text style={styles.focusLabel}>Lift Time</Text>
              </View>
            </View>

            <View style={styles.focusStat}>
              <View style={[styles.dot, { backgroundColor: COLORS.border }]} />
              <View>
                <Text style={styles.focusValue}>{formatDuration(session.total_rest_duration)}</Text>
                <Text style={styles.focusLabel}>Rest Time</Text>
              </View>
            </View>

            <View style={styles.focusStat}>
              <Text style={[styles.focusValue, { color: COLORS.success }]}>{workPercentage}%</Text>
              <Text style={styles.focusLabel}>Intensity</Text>
            </View>
          </View>
        </View>

        {/* === VOLUME STATS === */}
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <Text style={styles.gridValue}>{(totalVolume).toLocaleString()}</Text>
            <Text style={styles.gridLabel}>Total Volume (kg)</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridValue}>{session.exercises?.length || 0}</Text>
            <Text style={styles.gridLabel}>Exercises</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridValue}>
              {session.exercises?.reduce((acc, ex) => acc + ex.sets.length, 0) || 0}
            </Text>
            <Text style={styles.gridLabel}>Total Sets</Text>
          </View>
        </View>

        {/* === NOTES === */}
        {session.notes ? (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>SESSION NOTES</Text>
            <Text style={styles.noteText}>{session.notes}</Text>
          </View>
        ) : null}

        {/* === EXERCISE LIST === */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Workout Log</Text>

        {session.exercises && session.exercises.map((exercise, index) => (
          <View key={index} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              {/* Muscle Tag */}
              <View style={styles.muscleTag}>
                <Text style={styles.muscleText}>
                  {exercise.sets.length} Sets
                </Text>
              </View>
            </View>

            {/* Compact Set List */}
            <View style={styles.setList}>
              {exercise.sets.map((set, i) => (
                <View key={i} style={styles.setRow}>
                  <View style={styles.setBadge}>
                    <Text style={styles.setBadgeText}>{set.set_number}</Text>
                  </View>
                  <Text style={styles.setDetails}>
                    {set.reps} reps  <Text style={{ color: COLORS.textTertiary }}>×</Text>  {set.weight} kg
                  </Text>
                  {set.set_duration > 0 && (
                    <Text style={styles.setTime}>{set.set_duration}s</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* === FOOTER === */}
        <GlowingButton
          onPress={handleDeleteSession}
          glowColor="#F43F5E"
          style={{ width: '100%', height: 52, marginTop: SPACING.lg }}
          textStyle={{ fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold }}
        >
          Delete Workout Log
        </GlowingButton>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.md : SPACING.md,
    paddingBottom: 50,
  },

  // Header
  header: {
    marginBottom: SPACING.lg,
  },
  dateLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.text,
  },

  // Timeline Card
  timelineCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePoint: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.bold,
  },
  durationBadge: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  durationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 4,
  },
  durationLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  },

  // Focus Breakdown
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  focusCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  focusStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  focusStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  focusValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  focusLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  // Stats Grid
  gridContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  gridItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  gridValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  gridLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Notes
  noteContainer: {
    backgroundColor: 'rgba(255, 249, 196, 0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: '#FFF59D',
    marginBottom: SPACING.xl,
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFF59D',
    marginBottom: 6,
  },
  noteText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },

  // Exercise Log
  exerciseCard: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  exerciseName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  muscleTag: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muscleText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  setList: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  setBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  setDetails: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', // Monospaced for alignment
    fontWeight: '500',
  },
  setTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },

  // Footer
  deleteButton: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    padding: SPACING.md,
  },
  deleteText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
});