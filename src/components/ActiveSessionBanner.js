import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/SessionContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function ActiveSessionBanner() {
    const { activeSession, resumeSession } = useSession();
    const navigation = useNavigation();
    const [seconds, setSeconds] = useState(0);

    // Update timer every second
    useEffect(() => {
        if (!activeSession || !activeSession.startTime || activeSession.status === 'paused') {
            // If paused, we could show the saved duration if we had it, or just 00:00 or "PAUSED"
            // For now, let's keep it simple.
            return;
        }

        // Function to calculate and update elapsed time
        const updateTime = () => {
            const now = new Date();
            const start = new Date(activeSession.startTime);
            const elapsed = Math.floor((now - start) / 1000);
            setSeconds(Math.max(0, elapsed));
        };

        updateTime(); // Initial update
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [activeSession?.startTime, activeSession?.status]);

    if (!activeSession) return null;

    const handlePress = () => {

        navigation.navigate('SessionTracker', {
            sessionId: activeSession.sessionId,
            planId: activeSession.planId,
            workoutId: activeSession.workoutId,
        });
    };

    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins}:${s.toString().padStart(2, '0')}`;
    };

    const isResting = activeSession.status === 'resting';
    const isPaused = activeSession.status === 'paused';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isPaused ? styles.pausedContainer : (isResting ? styles.restingContainer : styles.activeContainer)
            ]}
            onPress={handlePress}
            activeOpacity={0.9}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={isPaused ? "pause" : (isResting ? "hourglass-outline" : "barbell-outline")}
                        size={24}
                        color={COLORS.background}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.statusLabel}>
                        {isPaused ? "WORKOUT PAUSED" : (isResting ? "RESTING" : "CURRENT EXERCISE")}
                    </Text>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                        {activeSession.exerciseName || "Workout in Progress"}
                    </Text>
                </View>
                <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>{formatTime(seconds)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.background} />
            </View>
        </TouchableOpacity>
    );
}

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        paddingTop: SPACING.md,
        ...SHADOWS.md,
    },
    activeContainer: {
        backgroundColor: COLORS.primary,
    },
    restingContainer: {
        backgroundColor: COLORS.warning, // Orange for rest
    },
    pausedContainer: {
        backgroundColor: COLORS.textSecondary, // Grey/Neutral for pause
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.circle,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    textContainer: {
        flex: 1,
        marginRight: SPACING.md,
    },
    statusLabel: {
        fontSize: 10,
        color: COLORS.background,
        fontWeight: FONT_WEIGHTS.bold,
        opacity: 0.8,
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    exerciseName: {
        fontSize: FONT_SIZES.md,
        color: COLORS.background,
        fontWeight: FONT_WEIGHTS.bold,
    },
    timerContainer: {
        marginRight: SPACING.sm,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.md,
    },
    timerText: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.background,
        fontWeight: FONT_WEIGHTS.bold,
        fontVariant: ['tabular-nums'],
    },
});
