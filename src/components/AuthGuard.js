import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState, Image, TouchableOpacity, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, commonStyles } from '../utils/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Create Context
export const AuthContext = React.createContext({
    setIgnoreBackground: () => { },
});

export default function AuthGuard({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [hasHardware, setHasHardware] = useState(false);
    const appState = useRef(AppState.currentState);
    const ignoreBackgroundRef = useRef(false);

    // Context Value
    const authContextValue = React.useMemo(() => ({
        setIgnoreBackground: (shouldIgnore) => {
            console.log(`🔒 Security Override: ${shouldIgnore ? 'ENABLED (Will not lock)' : 'DISABLED (Will lock)'}`);
            ignoreBackgroundRef.current = shouldIgnore;
        }
    }), []);

    useEffect(() => {
        checkHardware();
        let lockTimeout = null;

        const subscription = AppState.addEventListener('change', nextAppState => {
            const previousState = appState.current;
            appState.current = nextAppState;

            // Only lock when app goes to background AND we are not ignoring it
            if (nextAppState === 'background') {
                if (ignoreBackgroundRef.current) {
                    console.log('🛡️ App backgrounded, but ignoring lock due to override.');
                } else {
                    // Small delay to let any fullscreen-exit callbacks fire first
                    if (lockTimeout) clearTimeout(lockTimeout);
                    lockTimeout = setTimeout(() => {
                        // Double-check the flag in case it was set during the delay
                        if (!ignoreBackgroundRef.current) {
                            console.log('🔒 App backgrounded, locking...');
                            setIsAuthenticated(false);
                        }
                        lockTimeout = null;
                    }, 500);
                }
            }
        });

        // Initial auth
        authenticate();

        return () => {
            subscription.remove();
            if (lockTimeout) clearTimeout(lockTimeout);
        };
    }, []);

    const checkHardware = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setHasHardware(compatible && enrolled);

        // If no hardware or not enrolled, auto-authenticate to avoid locking out
        if (!compatible || !enrolled) {
            setIsAuthenticated(true);
        }
    };

    const authenticate = async () => {
        if (isAuthenticating) return;

        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        if (!compatible || !enrolled) {
            setIsAuthenticated(true);
            return;
        }

        setIsAuthenticating(true);
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock IronLog',
                fallbackLabel: 'Use Passcode',
                disableDeviceFallback: false,
                cancelLabel: 'Cancel',
            });

            if (result.success) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth error:', error);
        } finally {
            setIsAuthenticating(false);
        }
    };

    if (isAuthenticated) {
        return (
            <AuthContext.Provider value={authContextValue}>
                {children}
            </AuthContext.Provider>
        );
    }

    // Locked Screen
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="shield-lock-outline" size={80} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>IronLog Locked</Text>
            <Text style={styles.subtitle}>Unlock to access your workouts</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={authenticate}
                activeOpacity={0.8}
            >
                <Text style={styles.buttonText}>Unlock App</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    iconContainer: {
        marginBottom: SPACING.lg,
        padding: SPACING.lg,
        backgroundColor: 'rgba(255, 120, 73, 0.1)',
        borderRadius: 50,
    },
    title: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxl,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xxl,
        paddingVertical: SPACING.md,
        borderRadius: SPACING.lg,
    },
    buttonText: {
        color: COLORS.background,
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
    },
});
