import React, { useRef, useCallback } from 'react';
import {
    TouchableOpacity,
    Text,
    View,
    StyleSheet,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../utils/theme';
import HapticFeedback from '../utils/haptics';

/**
 * Convert hex color to rgba string.
 */
function hexToRgba(hex, alpha = 1) {
    let hexValue = hex.replace('#', '');

    if (hexValue.length === 3) {
        hexValue = hexValue
            .split('')
            .map((char) => char + char)
            .join('');
    }

    const r = parseInt(hexValue.substring(0, 2), 16);
    const g = parseInt(hexValue.substring(2, 4), 16);
    const b = parseInt(hexValue.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return `rgba(0, 0, 0, ${alpha})`;
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * GlowingButton — React Native port of the shadcn glowing-button.
 *
 * Features:
 * - Right-edge glow strip that slides across on press
 * - Gradient overlay (simulates the CSS ::after pseudo-element)
 * - Theme-aware dark design
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button label
 * @param {string} [props.glowColor='#a3e635'] - Glow accent color (hex)
 * @param {Function} [props.onPress] - Press handler
 * @param {Object} [props.style] - Additional container styles
 * @param {Object} [props.textStyle] - Additional text styles
 */
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function GlowingButton({
    children,
    glowColor = '#a3e635',
    onPress,
    style,
    textStyle,
    disabled = false,
}) {
    const glowTranslateX = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const glowColorFull = hexToRgba(glowColor, 1);
    const glowColorVia = hexToRgba(glowColor, 0.08);
    const glowColorTo = hexToRgba(glowColor, 0.22);

    const handlePressIn = useCallback(() => {
        HapticFeedback.light();
        Animated.parallel([
            Animated.spring(glowTranslateX, {
                toValue: 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
                toValue: 0.6,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 0.95,
                useNativeDriver: true,
                speed: 20,
            }),
        ]).start();
    }, [glowTranslateX, glowOpacity, scaleAnim]);

    const handlePressOut = useCallback(() => {
        Animated.parallel([
            Animated.spring(glowTranslateX, {
                toValue: 0,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                speed: 20,
            }),
        ]).start();
    }, [glowTranslateX, glowOpacity, scaleAnim]);

    // The glow strip slides from right edge → across the full width on press
    const stripTranslateX = glowTranslateX.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -300], // slides left across the button
    });

    return (
        <AnimatedTouchableOpacity
            activeOpacity={1}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[
                styles.wrapper,
                style,
                { transform: [{ scale: scaleAnim }] }
            ]}
        >
            {/* Base gradient background (from-background to-muted) */}
            <LinearGradient
                colors={[COLORS.elevated, COLORS.card]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={styles.baseGradient}
            />

            {/* Overlay gradient (::after — right-side glow tint) */}
            <LinearGradient
                colors={['transparent', glowColorVia, glowColorTo]}
                locations={[0.4, 0.7, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.overlayGradient}
            />

            {/* Glow strip on the right edge (::before — the sliding neon bar) */}
            <Animated.View
                style={[
                    styles.glowStrip,
                    {
                        backgroundColor: glowColorFull,
                        shadowColor: glowColorFull,
                        transform: [{ translateX: stripTranslateX }],
                    },
                ]}
            />

            {/* Inner highlight (inset shadow simulation) */}
            <View style={styles.innerHighlight} />

            {/* Content Container - Use View for layout flexibilty */}
            <Animated.View
                style={[
                    styles.contentContainer,
                    { opacity: glowOpacity },
                ]}
            >
                {React.Children.map(children, (child) => {
                    if (typeof child === 'string' || typeof child === 'number') {
                        return <Text style={[styles.text, textStyle]}>{child}</Text>;
                    }
                    return child;
                })}
            </Animated.View>
        </AnimatedTouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        height: 44,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderRightWidth: 0,
        borderColor: COLORS.border,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        position: 'relative',
    },
    baseGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BORDER_RADIUS.md,
    },
    overlayGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BORDER_RADIUS.md,
        zIndex: 2,
    },
    glowStrip: {
        position: 'absolute',
        right: 0,
        width: 5,
        height: '60%',
        borderTopLeftRadius: 3,
        borderBottomLeftRadius: 3,
        zIndex: 3,

        // Neon glow shadow
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 8,
    },
    innerHighlight: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BORDER_RADIUS.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(245, 247, 250, 0.08)',
        zIndex: 4,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    text: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text,
    },
});
