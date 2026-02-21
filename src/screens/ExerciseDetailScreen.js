import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles, getMuscleColor } from '../utils/theme';
import ExerciseService from '../services/exerciseService';
import { getVideosForExercise } from '../Demos/videoAssets';
import { AuthContext } from '../components/AuthGuard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPEED_OPTIONS = [1, 1.5, 2];

// Default tips based on category when no specific tips exist
const DEFAULT_TIPS_BY_CATEGORY = {
  'Push': [
    'Keep your core tight throughout the movement',
    'Control the eccentric (lowering) phase — 2-3 seconds',
    'Exhale on the push, inhale on the return',
    'Don\'t lock out joints completely at the top',
    'Focus on mind-muscle connection with the target muscle',
  ],
  'Pull': [
    'Initiate the pull with your back/target muscle, not your arms',
    'Squeeze at the peak contraction for 1 second',
    'Control the weight on the way down — no dropping',
    'Keep your shoulders down and back',
    'Use a full range of motion',
  ],
  'Isolation': [
    'Use lighter weight and focus on the squeeze',
    'Slow and controlled reps — no momentum',
    'Hold the peak contraction for 1-2 seconds',
    'Keep the rest of your body still',
    'Focus on feeling the muscle work through the full range',
  ],
  'Legs': [
    'Push through your heels (or full foot) depending on the exercise',
    'Keep your knees tracking over your toes',
    'Maintain a neutral spine throughout',
    'Brace your core before each rep',
    'Don\'t cut depth short — use full range of motion',
  ],
  'Core': [
    'Brace your core as if bracing for a punch',
    'Don\'t pull on your neck during crunching movements',
    'Focus on controlled breathing throughout',
    'Quality over quantity — slow reps beat fast reps',
    'Engage your pelvic floor for deeper core activation',
  ],
  'Olympic': [
    'Master the movement pattern with an empty bar first',
    'Keep the bar close to your body throughout',
    'Use explosive hip extension to drive the weight',
    'Catch the bar in a stable position before standing',
    'Warm up thoroughly before working sets',
  ],
  'Cardio': [
    'Start with a proper warm-up — 5 min at low intensity',
    'Maintain proper posture throughout',
    'Stay hydrated — sip water as needed',
    'Focus on breathing rhythm',
    'Cool down gradually, don\'t stop abruptly',
  ],
};

// Common mistakes by category
const COMMON_MISTAKES = {
  'Push': [
    'Using momentum instead of controlled reps',
    'Flaring elbows too wide',
    'Arching the lower back excessively',
    'Not going through full range of motion',
  ],
  'Pull': [
    'Using too much bicep and not enough back',
    'Rounding the lower back on rows/deadlifts',
    'Jerking the weight up with momentum',
    'Not fully extending on the eccentric phase',
  ],
  'Isolation': [
    'Going too heavy and losing form',
    'Swinging or using body momentum',
    'Rushing through reps',
    'Not controlling the negative portion',
  ],
  'Legs': [
    'Knees caving inward',
    'Rising on toes during squats',
    'Rounding the lower back',
    'Not reaching proper depth',
  ],
  'Core': [
    'Pulling on the neck during crunches',
    'Holding breath instead of controlled breathing',
    'Using hip flexors instead of abs',
    'Arching the lower back off the ground',
  ],
  'Olympic': [
    'Not keeping the bar close to the body',
    'Pulling with the arms too early',
    'Not achieving full hip extension',
    'Catching in an unstable position',
  ],
  'Cardio': [
    'Starting too fast without warming up',
    'Poor posture — slouching or hunching',
    'Not staying hydrated',
    'Skipping the cool-down',
  ],
};

const getDifficultyInfo = (difficulty) => {
  switch (difficulty) {
    case 'Beginner':
      return { color: COLORS.success, icon: '🟢', label: 'Beginner', desc: 'Great for starters' };
    case 'Intermediate':
      return { color: COLORS.warning, icon: '🟡', label: 'Intermediate', desc: 'Some experience needed' };
    case 'Advanced':
      return { color: COLORS.error, icon: '🔴', label: 'Advanced', desc: 'For experienced lifters' };
    default:
      return { color: COLORS.textSecondary, icon: '⚪', label: difficulty || 'Any', desc: '' };
  }
};

const getEquipmentIcon = (equipment) => {
  const icons = {
    'Barbell': '🏋️',
    'Dumbbell': '💪',
    'Machine': '⚙️',
    'Cable': '🔗',
    'Bodyweight': '🧍',
    'Kettlebell': '🔔',
    'Plate': '⭕',
    'Equipment': '🛠️',
  };
  return icons[equipment] || '🏋️';
};

export default function ExerciseDetailScreen({ route, navigation }) {
  const { exercise } = route.params;
  const [isFavorite, setIsFavorite] = useState(exercise.is_favorite === 1);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const videoViewRef = useRef(null);
  const { setIgnoreBackground } = useContext(AuthContext);
  const isFullscreenRef = useRef(false);

  const muscleColor = getMuscleColor(exercise.target_muscle);
  const difficultyInfo = getDifficultyInfo(exercise.difficulty);
  const equipmentIcon = getEquipmentIcon(exercise.equipment);

  // Look up demo videos for this exercise
  const demoVideos = getVideosForExercise(exercise.name);

  // Create video player — no loop, no auto-play
  const player = useVideoPlayer(demoVideos.length > 0 ? demoVideos[0] : null, (player) => {
    player.loop = false;
    player.preservesPitch = true;
  });

  // Track playing state
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Track status to detect when video ends
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (status === 'idle' && !isPlaying) {
      // Video reached the end (status goes idle when done and not looping)
      setIsEnded(true);
    }
  }, [status, isPlaying]);

  // Switch video source when the active angle tab changes
  useEffect(() => {
    if (player && demoVideos.length > 0 && demoVideos[activeVideoIndex]) {
      player.replaceAsync(demoVideos[activeVideoIndex]);
      setIsEnded(false);
    }
  }, [activeVideoIndex]);

  // Parse tips from database or use defaults
  const parsedTips = exercise.tips
    ? exercise.tips.split('\n').filter(t => t.trim())
    : (DEFAULT_TIPS_BY_CATEGORY[exercise.category] || DEFAULT_TIPS_BY_CATEGORY['Push']);

  const mistakes = COMMON_MISTAKES[exercise.category] || COMMON_MISTAKES['Push'];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Cleanup: ensure security lock is re-enabled if screen unmounts while fullscreen
    return () => {
      if (isFullscreenRef.current) {
        setIgnoreBackground(false);
        isFullscreenRef.current = false;
      }
    };
  }, []);

  // Set header
  useEffect(() => {
    navigation.setOptions({
      title: '',
      headerStyle: {
        backgroundColor: COLORS.surface,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      },
      headerTintColor: COLORS.text,
    });
  }, [navigation]);

  const toggleFavorite = async () => {
    try {
      await ExerciseService.toggleFavorite(exercise.id);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ===== HERO SECTION ===== */}
          <View style={styles.heroSection}>
            {/* Muscle color accent bar */}
            <View style={[styles.accentBar, { backgroundColor: muscleColor }]} />

            <View style={styles.heroContent}>
              {/* Muscle badge */}
              <View style={[styles.muscleBadge, { backgroundColor: muscleColor }]}>
                <Text style={styles.muscleBadgeText}>{exercise.target_muscle}</Text>
              </View>

              {/* Exercise name + favorite */}
              <View style={styles.nameRow}>
                <Text style={styles.exerciseName} numberOfLines={3}>
                  {exercise.name}
                </Text>
                <TouchableOpacity
                  onPress={toggleFavorite}
                  style={styles.favoriteButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.favoriteIcon}>
                    {isFavorite ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Category subtitle */}
              <Text style={styles.categoryText}>{exercise.category} Exercise</Text>
            </View>
          </View>

          {/* ===== VIDEO DEMO ===== */}
          {demoVideos.length > 0 ? (
            <View style={styles.videoCard}>
              {/* Tab buttons when there are 2 video angles */}
              {demoVideos.length > 1 && (
                <View style={styles.videoTabRow}>
                  {demoVideos.map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.videoTab,
                        activeVideoIndex === idx && styles.videoTabActive,
                      ]}
                      onPress={() => setActiveVideoIndex(idx)}
                    >
                      <Text
                        style={[
                          styles.videoTabText,
                          activeVideoIndex === idx && styles.videoTabTextActive,
                        ]}
                      >
                        Angle {idx + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Video player — portrait-friendly 9:16 container */}
              <View style={styles.videoContainer}>
                <VideoView
                  ref={videoViewRef}
                  player={player}
                  style={styles.videoPlayer}
                  contentFit="contain"
                  nativeControls={false}
                  onFullscreenEnter={() => {
                    console.log('🎬 Video entered fullscreen');
                    setIgnoreBackground(true);
                    isFullscreenRef.current = true;
                  }}
                  onFullscreenExit={() => {
                    console.log('🎬 Video exited fullscreen');
                    setIgnoreBackground(false);
                    isFullscreenRef.current = false;
                  }}
                />

                {/* Custom Controls Overlay */}
                <View style={styles.controlsOverlay}>
                  {/* Center: Play / Pause / Replay */}
                  <TouchableOpacity
                    style={styles.centerPlayButton}
                    onPress={() => {
                      if (isEnded) {
                        player.currentTime = 0;
                        player.play();
                        setIsEnded(false);
                      } else if (isPlaying) {
                        player.pause();
                      } else {
                        player.play();
                        setIsEnded(false);
                      }
                    }}
                  >
                    <Ionicons
                      name={isEnded ? 'refresh' : isPlaying ? 'pause' : 'play'}
                      size={40}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>

                {/* Bottom Control Bar */}
                <View style={styles.bottomControlBar}>
                  {/* Mute Toggle */}
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => {
                      const newMuted = !isMuted;
                      setIsMuted(newMuted);
                      player.muted = newMuted;
                    }}
                  >
                    <Ionicons
                      name={isMuted ? 'volume-mute' : 'volume-high'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>

                  {/* Speed Toggle */}
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => {
                      const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length;
                      setSpeedIndex(nextIndex);
                      player.playbackRate = SPEED_OPTIONS[nextIndex];
                    }}
                  >
                    <Text style={styles.speedText}>{SPEED_OPTIONS[speedIndex]}x</Text>
                  </TouchableOpacity>

                  {/* Fullscreen */}
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => {
                      setIgnoreBackground(true);
                      isFullscreenRef.current = true;
                      videoViewRef.current?.enterFullscreen();
                      // Safety fallback: re-enable lock after 60s in case exit isn't detected
                      setTimeout(() => {
                        if (isFullscreenRef.current) {
                          setIgnoreBackground(false);
                          isFullscreenRef.current = false;
                        }
                      }, 60000);
                    }}
                  >
                    <Ionicons name="expand" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.videoCaption}>Form Demo</Text>
            </View>
          ) : (
            <View style={styles.videoCard}>
              <View style={styles.videoPlaceholder}>
                <View style={styles.playButtonCircle}>
                  <Text style={styles.playButtonIcon}>▶</Text>
                </View>
                <Text style={styles.videoTitle}>Form Demo</Text>
                <Text style={styles.videoSubtext}>Video coming soon</Text>
              </View>
            </View>
          )}

          {/* ===== QUICK INFO ROW ===== */}
          <View style={styles.infoRow}>
            {/* Difficulty */}
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>{difficultyInfo.icon}</Text>
              <Text style={styles.infoLabel}>Difficulty</Text>
              <Text style={[styles.infoValue, { color: difficultyInfo.color }]}>
                {difficultyInfo.label}
              </Text>
            </View>

            {/* Equipment */}
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>{equipmentIcon}</Text>
              <Text style={styles.infoLabel}>Equipment</Text>
              <Text style={styles.infoValue}>{exercise.equipment}</Text>
            </View>

            {/* Category */}
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📂</Text>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{exercise.category}</Text>
            </View>
          </View>

          {/* ===== HOW TO PERFORM ===== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📖</Text>
              <Text style={styles.sectionTitle}>How to Perform</Text>
            </View>

            {parsedTips.map((tip, index) => {
              // Remove leading numbers/dots if present
              const cleanTip = tip.replace(/^\d+[\.\)]\s*/, '').trim();
              return (
                <View key={index} style={styles.tipRow}>
                  <View style={[styles.tipNumber, { backgroundColor: muscleColor + '25' }]}>
                    <Text style={[styles.tipNumberText, { color: muscleColor }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={styles.tipText}>{cleanTip}</Text>
                </View>
              );
            })}
          </View>

          {/* ===== COMMON MISTAKES ===== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>⚠️</Text>
              <Text style={styles.sectionTitle}>Common Mistakes</Text>
            </View>

            {mistakes.map((mistake, index) => (
              <View key={index} style={styles.mistakeRow}>
                <View style={styles.mistakeIcon}>
                  <Text style={styles.mistakeX}>✕</Text>
                </View>
                <Text style={styles.mistakeText}>{mistake}</Text>
              </View>
            ))}
          </View>

          {/* ===== MUSCLE WORKED ===== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🎯</Text>
              <Text style={styles.sectionTitle}>Target Muscle</Text>
            </View>

            <View style={styles.muscleTargetRow}>
              <View style={[styles.muscleTargetDot, { backgroundColor: muscleColor }]} />
              <View style={styles.muscleTargetInfo}>
                <Text style={styles.muscleTargetName}>{exercise.target_muscle}</Text>
                <Text style={styles.muscleTargetLabel}>Primary Muscle Group</Text>
              </View>
              <View style={[styles.muscleTargetBadge, { borderColor: muscleColor }]}>
                <Text style={[styles.muscleTargetBadgeText, { color: muscleColor }]}>
                  Primary
                </Text>
              </View>
            </View>
          </View>

          {/* ===== PRO TIP ===== */}
          <View style={[styles.sectionCard, styles.proTipCard]}>
            <View style={styles.proTipHeader}>
              <Text style={styles.proTipIcon}>💡</Text>
              <Text style={styles.proTipTitle}>Pro Tip</Text>
            </View>
            <Text style={styles.proTipText}>
              {exercise.difficulty === 'Beginner'
                ? 'Start with a weight you can control for 12-15 reps with perfect form. Increase weight gradually as you get stronger.'
                : exercise.difficulty === 'Advanced'
                  ? 'Focus on progressive overload — aim to increase weight, reps, or sets each week. Track your numbers to ensure consistent progress.'
                  : 'Focus on the mind-muscle connection. Slow down the eccentric phase (lowering) to 2-3 seconds for maximum muscle activation.'}
            </Text>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },

  // ===== HERO =====
  heroSection: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  heroContent: {
    padding: SPACING.lg,
  },
  muscleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  muscleBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exerciseName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.md,
    lineHeight: 32,
  },
  favoriteButton: {
    padding: SPACING.xs,
    marginTop: 2,
  },
  favoriteIcon: {
    fontSize: 28,
  },
  categoryText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // ===== VIDEO =====
  videoCard: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  videoTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  videoTab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  videoTabActive: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  videoTabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  videoTabTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 420,
    backgroundColor: COLORS.background,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  controlButton: {
    padding: 8,
  },
  speedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.bold,
  },
  videoCaption: {
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  videoPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  playButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '30',
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  playButtonIcon: {
    fontSize: 24,
    color: COLORS.primary,
    marginLeft: 4,
  },
  videoTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  videoSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },

  // ===== QUICK INFO ROW =====
  infoRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: {
    fontSize: 24,
    marginBottom: SPACING.sm,
  },
  infoLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    textAlign: 'center',
  },

  // ===== SECTION CARD =====
  sectionCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },

  // ===== TIPS =====
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginTop: 1,
  },
  tipNumberText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  tipText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // ===== MISTAKES =====
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  mistakeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginTop: 1,
  },
  mistakeX: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.error,
  },
  mistakeText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // ===== MUSCLE TARGET =====
  muscleTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muscleTargetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.md,
  },
  muscleTargetInfo: {
    flex: 1,
  },
  muscleTargetName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  muscleTargetLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  muscleTargetBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  muscleTargetBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  // ===== PRO TIP =====
  proTipCard: {
    borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primary + '08',
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  proTipIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  proTipTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  proTipText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});