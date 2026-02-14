import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../utils/theme';
import GlowingButton from './GlowingButton';

// ============================================================
// ALERT TYPE CONFIG
// ============================================================
const ALERT_TYPES = {
    error: {
        icon: 'close-circle',
        color: '#FB7185',       // Rose-400 (matching shadcn design)
        bgTint: 'rgba(251, 113, 133, 0.1)',
    },
    success: {
        icon: 'checkmark-circle',
        color: COLORS.success,
        bgTint: 'rgba(0, 227, 140, 0.1)',
    },
    warning: {
        icon: 'warning',
        color: COLORS.warning,
        bgTint: 'rgba(255, 200, 87, 0.1)',
    },
    info: {
        icon: 'information-circle',
        color: COLORS.info,
        bgTint: 'rgba(76, 201, 240, 0.1)',
    },
    confirm: {
        icon: 'help-circle',
        color: COLORS.primary,
        bgTint: 'rgba(255, 120, 73, 0.1)',
    },
    destructive: {
        icon: 'trash',
        color: COLORS.error,
        bgTint: 'rgba(255, 77, 79, 0.1)',
    },
};

// ============================================================
// GLOBAL REF (call showAlert from anywhere)
// ============================================================
let _alertRef = null;

export function setAlertRef(ref) {
    _alertRef = ref;
}

/**
 * Show a themed alert dialog from anywhere in the app.
 *
 * @param {Object} options
 * @param {'error'|'success'|'warning'|'info'|'confirm'|'destructive'} options.type
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.errorCode] - Optional monospace error code block
 * @param {Array<{text:string, onPress?:Function, style?:'cancel'|'destructive'|'default'}>} [options.buttons]
 */
export function showAlert(options) {
    if (_alertRef?.current) {
        _alertRef.current.show(options);
    } else {
        // Fallback to native Alert if ref not available yet
        const { Alert } = require('react-native');
        const buttons = options.buttons || [{ text: 'OK' }];
        Alert.alert(options.title || '', options.message || '', buttons);
    }
}

// ============================================================
// COMPONENT
// ============================================================
const CustomAlertDialog = forwardRef((props, ref) => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState({
        type: 'info',
        title: '',
        message: '',
        errorCode: null,
        buttons: [{ text: 'OK' }],
    });

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.85)).current;

    const animateIn = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, scaleAnim]);

    const animateOut = useCallback((callback) => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.85,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            if (callback) callback();
        });
    }, [fadeAnim, scaleAnim]);

    useImperativeHandle(ref, () => ({
        show: (options) => {
            const defaultButtons = [{ text: 'OK' }];
            setConfig({
                type: options.type || 'info',
                title: options.title || '',
                message: options.message || '',
                errorCode: options.errorCode || null,
                buttons: options.buttons || defaultButtons,
            });
            setVisible(true);
            // Small delay so modal mounts before animating
            setTimeout(animateIn, 50);
        },
    }));

    const handleButtonPress = (button) => {
        animateOut(() => {
            if (button.onPress) button.onPress();
        });
    };

    const alertType = ALERT_TYPES[config.type] || ALERT_TYPES.info;

    // Determine glow color for each button
    const getGlowColor = (button) => {
        const isCancel = button.style === 'cancel';
        const isDestructive = button.style === 'destructive';

        if (isCancel) return '#64748b'; // Slate for cancel
        if (isDestructive) return '#F43F5E'; // Rose for destructive

        // Default / primary — map by alert type
        if (config.type === 'error' || config.type === 'destructive') return '#F43F5E';
        if (config.type === 'success') return COLORS.success;
        if (config.type === 'warning') return COLORS.warning;
        return COLORS.primary; // confirm, info, default
    };

    // Layout: horizontal (row) for ≤2 buttons, vertical (column) for 3+
    const isVertical = config.buttons.length > 2;

    // Sort: for horizontal → cancel on left, actions on right
    //        for vertical  → actions on top, cancel at bottom (natural thumb reach)
    const sortedButtons = [...config.buttons].sort((a, b) => {
        if (isVertical) {
            // Cancel goes last (bottom) in vertical layout
            if (a.style === 'cancel') return 1;
            if (b.style === 'cancel') return -1;
            // Destructive goes last before cancel
            if (a.style === 'destructive') return 1;
            if (b.style === 'destructive') return -1;
        } else {
            // Cancel goes first (left) in horizontal layout
            if (a.style === 'cancel') return -1;
            if (b.style === 'cancel') return 1;
        }
        return 0;
    });

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={() => animateOut()}
            statusBarTranslucent
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <Animated.View
                    style={[
                        styles.dialog,
                        {
                            transform: [{ scale: scaleAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconWrapper, { backgroundColor: alertType.bgTint }]}>
                            <Ionicons name={alertType.icon} size={22} color={alertType.color} />
                        </View>
                        <Text style={styles.title}>{config.title}</Text>
                    </View>

                    {/* Message */}
                    {!!config.message && (
                        <Text style={styles.message}>{config.message}</Text>
                    )}

                    {/* Error Code Block (optional) */}
                    {!!config.errorCode && (
                        <View style={styles.errorCodeBox}>
                            <Text style={styles.errorCodeText}>{config.errorCode}</Text>
                        </View>
                    )}

                    {/* Buttons */}
                    <View style={[
                        styles.buttonGroup,
                        isVertical && styles.buttonGroupVertical,
                        sortedButtons.length === 1 && styles.buttonGroupSingle,
                    ]}>
                        {sortedButtons.map((button, index) => {
                            const glowColor = getGlowColor(button);
                            return (
                                <GlowingButton
                                    key={index}
                                    onPress={() => handleButtonPress(button)}
                                    glowColor={glowColor}
                                    style={[
                                        { flex: isVertical ? 0 : 1, width: isVertical ? '100%' : undefined, height: 44 },
                                    ]}
                                    textStyle={{ fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold }}
                                >
                                    {button.text}
                                </GlowingButton>
                            );
                        })}
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
});

CustomAlertDialog.displayName = 'CustomAlertDialog';

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    dialog: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: COLORS.card,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,

        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 25,
        elevation: 15,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text,
        flex: 1,
    },

    // Message
    message: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginBottom: SPACING.md,
        marginLeft: SPACING.xs,
    },

    // Error Code Block
    errorCodeBox: {
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    errorCodeText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
        lineHeight: 18,
    },

    // Buttons
    buttonGroup: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.xs,
    },
    buttonGroupVertical: {
        flexDirection: 'column',
        gap: SPACING.sm,
    },
    buttonGroupSingle: {
        justifyContent: 'flex-end',
    },
    button: {
        flex: 1,
        paddingVertical: SPACING.md - 2,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    buttonVertical: {
        flex: 0,
        width: '100%',
    },
    buttonText: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
    },

    // Button variants
    buttonPrimary: {
        backgroundColor: COLORS.primary,
    },
    buttonTextPrimary: {
        color: COLORS.background,
        fontWeight: FONT_WEIGHTS.bold,
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    buttonTextSecondary: {
        color: COLORS.textSecondary,
    },
    buttonDestructive: {
        backgroundColor: COLORS.error,
    },
    buttonTextDestructive: {
        color: '#FFFFFF',
        fontWeight: FONT_WEIGHTS.bold,
    },
});

export default CustomAlertDialog;
