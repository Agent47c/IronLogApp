import { Platform } from 'react-native';

import * as Haptics from 'expo-haptics';

const isWeb = Platform.OS === 'web';

const HapticFeedback = {
    light: async () => {
        if (isWeb) return;
        try {
            if (Haptics && Haptics.impactAsync) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (e) {
            console.warn('Haptics error', e);
        }
    },
    medium: async () => {
        if (isWeb) return;
        try {
            if (Haptics && Haptics.impactAsync) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        } catch (e) {
            console.warn('Haptics error', e);
        }
    },
    heavy: async () => {
        if (isWeb) return;
        try {
            if (Haptics && Haptics.impactAsync) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
        } catch (e) {
            console.warn('Haptics error', e);
        }
    },
    success: async () => {
        if (isWeb) return;
        try {
            if (Haptics && Haptics.notificationAsync) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.warn('Haptics error', e);
        }
    },
    warning: async () => {
        if (isWeb) return;
        try {
            if (Haptics && Haptics.notificationAsync) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
        } catch (e) {
            console.warn('Haptics error', e);
        }
    },
    error: async () => {
        if (isWeb) return;
        try {
            if (Haptics && Haptics.notificationAsync) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (e) {
            console.warn('Haptics error', e);
        }
    },
    selection: async () => {
        if (isWeb) return;
        try {
            if (Haptics && Haptics.selectionAsync) {
                await Haptics.selectionAsync();
            }
        } catch (e) {
            console.warn('Haptics error', e);
        }
    }
};

export default HapticFeedback;
