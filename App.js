import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database/schema';
import ExerciseService from './src/services/exerciseService';
import { COLORS } from './src/utils/theme';
import CustomAlertDialog, { setAlertRef } from './src/components/CustomAlertDialog';
import { SessionProvider } from './src/context/SessionContext';
import AuthGuard from './src/components/AuthGuard'; // Added import

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const alertRef = useRef(null);

  useEffect(() => {
    // Register the global alert ref
    setAlertRef(alertRef);
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize database
        await initDatabase();

        // Seed exercises
        await ExerciseService.seedExercises();

        // Any other initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <SessionProvider>
        {/* Hide status bar for full-screen experience */}
        <StatusBar hidden={true} />
        <AuthGuard>
          <AppNavigator />
        </AuthGuard>
        <CustomAlertDialog ref={alertRef} />
      </SessionProvider>
    </>
  );
}