import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../utils/theme';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import WorkoutPlanScreen from '../screens/WorkoutPlanScreen';
import GymSessionScreen from '../screens/GymSessionScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Detail screens
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import PlanBuilderScreen from '../screens/PlanBuilderScreen';
import SessionTrackerScreen from '../screens/SessionTrackerScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import ReportsScreen from '../screens/ReportsScreen';
import PlanSuccessScreen from '../screens/PlanSuccessScreen';
import ExerciseConfigScreen from '../screens/ExerciseConfigScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Circular tab icon without borders
const TabIcon = ({ icon, isActive }) => (
  <View style={tabIconStyles.container}>
    <View style={[
      tabIconStyles.iconWrapper,
      isActive && tabIconStyles.iconWrapperActive
    ]}>
      <Text style={tabIconStyles.iconText}>
        {icon}
      </Text>
    </View>
  </View>
);

const tabIconStyles = StyleSheet.create({
  container: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: 'transparent',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,

    //elevation: 10,
  },
  iconText: {
    fontSize: 24,
    lineHeight: 26,
    textAlign: 'center',

  },
});

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 75,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
          paddingHorizontal: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: FONT_SIZES.xs,
          fontWeight: FONT_WEIGHTS.semibold,
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" isActive={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExerciseLibraryScreen}
        options={{
          tabBarLabel: 'Exercises',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💪" isActive={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Workout"
        component={GymSessionScreen}
        options={{
          tabBarLabel: 'Workout',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🔥" isActive={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Plans"
        component={WorkoutPlanScreen}
        options={{
          tabBarLabel: 'Plans',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📋" isActive={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📊" isActive={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Custom Navigation Theme to fix white glitches on transitions
const IronLogTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

// Main Stack Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer theme={IronLogTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontSize: FONT_SIZES.xl,
            fontWeight: FONT_WEIGHTS.bold,
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ExerciseDetail"
          component={ExerciseDetailScreen}
          options={{ title: 'Exercise Details' }}
        />
        <Stack.Screen
          name="PlanBuilder"
          component={PlanBuilderScreen}
          options={{ title: 'Build Plan' }}
        />
        <Stack.Screen
          name="ExerciseConfig"
          component={ExerciseConfigScreen}
          options={{ title: 'Configure Exercise' }}
        />
        <Stack.Screen
          name="PlanSuccess"
          component={PlanSuccessScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SessionTracker"
          component={SessionTrackerScreen}
          options={{ title: 'Workout Session' }}
        />
        <Stack.Screen
          name="SessionDetail"
          component={SessionDetailScreen}
          options={{ title: 'Session Details' }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: 'Analytics' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile' }}

        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ headerShown: false }}

        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}