import React, { createContext, useContext, useState, useEffect } from 'react';
import SessionService from '../services/sessionService';
import ExerciseService from '../services/exerciseService';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
    const [activeSession, setActiveSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial load
    useEffect(() => {
        checkActiveSession();
    }, []);

    const checkActiveSession = async () => {
        try {
            const session = await SessionService.getActiveSession();
            if (session) {
                let startTime = new Date(session.check_in_time);
                let status = 'working';
                let exerciseName = 'Workout in Progress';

                // 1. Get Exercise Name
                if (session.current_exercise_id) {
                    try {
                        const allExercises = await ExerciseService.getAllExercises();
                        // Use loose equality as ID types might differ (string vs number)
                        const ex = allExercises.find(e => e.id == session.current_exercise_id);
                        if (ex) exerciseName = ex.name;
                    } catch (e) {
                        console.log('Failed to load exercise name for banner', e);
                    }
                }

                // 2. Determine Timer State
                if (session.active_timer_state) {
                    const state = typeof session.active_timer_state === 'string'
                        ? JSON.parse(session.active_timer_state)
                        : session.active_timer_state;

                    if (state.isPaused) {
                        status = 'paused';
                        startTime = new Date(session.check_in_time); // Keep original start time for reference
                    } else if (state.isResting && state.restStartTime) {
                        status = 'resting';
                        startTime = new Date(state.restStartTime);
                    } else if (state.isSetActive && state.setStartTime) {
                        status = 'working';
                        startTime = new Date(state.setStartTime);
                    }
                }

                updateActiveSession({
                    sessionId: session.id,
                    planId: session.plan_id,
                    workoutId: session.day_id,
                    startTime,
                    status,
                    exerciseName,
                });
            } else {
                setActiveSession(null);
            }
        } catch (error) {
            console.error('Error checking active session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateActiveSession = (data) => {
        setActiveSession(prev => ({
            ...prev,
            ...data
        }));
    };

    const clearSession = () => {
        setActiveSession(null);
    };

    return (
        <SessionContext.Provider value={{ activeSession, updateActiveSession, clearSession, checkActiveSession, isLoading }}>
            {children}
        </SessionContext.Provider>
    );
};