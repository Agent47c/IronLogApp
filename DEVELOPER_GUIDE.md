# Developer Guide - IronLog Gym Tracker

## Quick Start Development

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Or use Expo CLI directly
expo start
```

### Development Workflow

1. **Hot Reload**: Changes auto-refresh on save
2. **Debug Menu**: Shake device or `Ctrl+M` (Android) / `Cmd+D` (iOS)
3. **Console Logs**: View in terminal where `expo start` runs

## Architecture Overview

### Data Flow

```
User Interface (Screens)
    ↓
Services (Business Logic)
    ↓
Database (SQLite)
```

### Key Services

**ExerciseService** - Exercise CRUD operations
- `getAllExercises()` - Fetch all exercises
- `searchExercises(query)` - Search exercises
- `getExercisesByMuscle(muscle)` - Filter by muscle
- `toggleFavorite(id)` - Mark as favorite

**WorkoutPlanService** - Plan management
- `createPlan(name, type, desc)` - Create new plan
- `getPlanById(id)` - Get plan with days/exercises
- `addDayToPlan(planId, dayName, order)` - Add day
- `addExerciseToDay(dayId, exerciseId, order)` - Add exercise
- `setActivePlan(id)` - Set active plan

**SessionService** - Workout tracking
- `startSession(planId, dayId)` - Begin workout
- `logSet(sessionId, exerciseId, setNum, reps, weight)` - Log set
- `addCardio(sessionId, type, duration, speed, distance)` - Log cardio
- `endSession(sessionId)` - Finish workout
- `getSessionById(id)` - Get session details

**AnalyticsService** - Progress tracking
- `getStatsSummary()` - Overall stats
- `generateWeeklyReport(weekStart)` - Weekly summary
- `getWorkoutFrequency()` - Frequency by day
- `getMostPerformedExercises(limit)` - Top exercises

## Adding New Features

### Add a New Screen

1. Create screen file in `src/screens/`
2. Add route in `src/navigation/AppNavigator.js`
3. Import screen in navigator
4. Add navigation option

Example:
```javascript
// 1. Create src/screens/NewFeatureScreen.js
import React from 'react';
import { View, Text } from 'react-native';
import { commonStyles } from '../utils/theme';

export default function NewFeatureScreen() {
  return (
    <View style={commonStyles.container}>
      <Text>New Feature</Text>
    </View>
  );
}

// 2. Add to AppNavigator.js
import NewFeatureScreen from '../screens/NewFeatureScreen';

// In Stack.Navigator:
<Stack.Screen 
  name="NewFeature" 
  component={NewFeatureScreen}
  options={{ title: 'New Feature' }}
/>

// 3. Navigate from any screen:
navigation.navigate('NewFeature');
```

### Add Database Table

1. Edit `src/database/schema.js`
2. Add CREATE TABLE in `initDatabase()`
3. Create service file for operations

Example:
```javascript
// In schema.js initDatabase()
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS new_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
```

### Add New Service Method

```javascript
// src/services/yourService.js
import { getDatabase } from '../database/schema';

export const YourService = {
  create: async (data) => {
    const db = getDatabase();
    const result = await db.runAsync(
      'INSERT INTO table_name (column) VALUES (?)',
      [data]
    );
    return result.lastInsertRowId;
  },
  
  getAll: async () => {
    const db = getDatabase();
    return await db.getAllAsync('SELECT * FROM table_name');
  },
};
```

## Styling Guide

### Use Theme Constants

```javascript
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../utils/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  text: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
  },
});
```

### Muscle Group Colors

```javascript
import { getMuscleColor } from '../utils/theme';

// Get color for any muscle
const color = getMuscleColor('Chest'); // Returns COLORS.chest
```

### Common Styles

```javascript
import { commonStyles } from '../utils/theme';

// Use pre-defined styles
<View style={commonStyles.container}>
  <View style={commonStyles.card}>
    <View style={commonStyles.rowBetween}>
      {/* Content */}
    </View>
  </View>
</View>
```

## Database Queries

### Select
```javascript
const db = getDatabase();

// Get one
const item = await db.getFirstAsync('SELECT * FROM table WHERE id = ?', [id]);

// Get all
const items = await db.getAllAsync('SELECT * FROM table ORDER BY name');
```

### Insert
```javascript
const result = await db.runAsync(
  'INSERT INTO table (name, value) VALUES (?, ?)',
  [name, value]
);
const newId = result.lastInsertRowId;
```

### Update
```javascript
await db.runAsync(
  'UPDATE table SET name = ? WHERE id = ?',
  [newName, id]
);
```

### Delete
```javascript
await db.runAsync('DELETE FROM table WHERE id = ?', [id]);
```

## Navigation Patterns

### Navigate to Screen
```javascript
navigation.navigate('ScreenName', { param: value });
```

### Go Back
```javascript
navigation.goBack();
```

### Access Route Params
```javascript
function MyScreen({ route }) {
  const { param } = route.params || {};
  // Use param
}
```

### Listen to Focus
```javascript
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    // Runs when screen focuses
    loadData();
  }, [])
);
```

## Testing

### Manual Testing Checklist

- [ ] Create workout plan
- [ ] Add exercises to plan
- [ ] Start workout session
- [ ] Log sets and reps
- [ ] Complete workout
- [ ] View in history
- [ ] Check stats update
- [ ] Search exercises
- [ ] Filter by muscle group
- [ ] Mark favorites

### Debug Database

```javascript
// View all tables
const tables = await db.getAllAsync(
  "SELECT name FROM sqlite_master WHERE type='table'"
);
console.log('Tables:', tables);

// View table data
const data = await db.getAllAsync('SELECT * FROM exercises LIMIT 10');
console.log('Sample data:', data);
```

## Performance Tips

1. **Use FlatList for long lists** (already implemented)
2. **Memoize callbacks** with `useCallback`
3. **Batch database operations** when possible
4. **Use indexes** on frequently queried columns
5. **Lazy load** images and videos

## Common Issues

### "Database not initialized"
- Ensure `initDatabase()` called before any queries
- Check App.js initialization

### "Cannot read property of undefined"
- Check route params: `route.params || {}`
- Validate data before use: `data?.property`

### Slow performance
- Check FlatList keyExtractor
- Optimize database queries
- Reduce re-renders with React.memo

## Build & Deploy

### Development Build
```bash
expo build:android -t apk
# or
expo build:ios
```

### Production Build (EAS)
```bash
eas build --platform android --profile production
```

### Local Android Build
```bash
expo prebuild
cd android
./gradlew assembleRelease
# APK in: android/app/build/outputs/apk/release/
```

## Environment Setup

### Required Tools
- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### VS Code Extensions (Recommended)
- React Native Tools
- ESLint
- Prettier
- SQLite Viewer

## Resources

- [Expo Docs](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [SQLite Docs](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [React Native Docs](https://reactnative.dev)

---

Happy coding! 💪
