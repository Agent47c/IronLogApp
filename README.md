# 🏋️ IronLog - Offline Gym Tracker

A fully offline, personal gym tracking mobile application built with **React Native** and **Expo**.

## 📱 Features

### Core Modules

1. **Exercise Library (400+ Exercises)**
   - Browse 400+ pre-loaded exercises
   - Search and filter by muscle group, category, equipment
   - Mark favorites
   - Organized by muscle groups

2. **Workout Plan Builder**
   - Create custom workout splits (PPL, Bro Split, Custom)
   - Add exercises to specific days
   - Set active workout plan
   - Manage multiple plans

3. **Real-Time Session Tracking**
   - Start gym sessions
   - Log exercises, sets, reps, and weight
   - Track cardio
   - Rest timer between sets
   - Auto-save progress

4. **Workout History**
   - View all past sessions
   - Detailed session breakdowns
   - Exercise performance history
   - Personal records tracking

5. **Analytics & Reports**
   - Weekly workout summaries
   - Volume tracking
   - Consistency metrics
   - Progress visualization

6. **User Profile**
   - Personal stats (age, weight, height)
   - Fitness goals
   - Experience level

## 🎨 Design

- **Dark Mode** - Gym-style aesthetic with neon accents
- **Muscle Group Colors** - Visual coding for different muscle groups
- **Smooth Animations** - React Native Reanimated
- **Gesture-Based Navigation** - Intuitive touch controls

## 🛠️ Tech Stack

### Frontend
- React Native 0.74
- Expo SDK 51
- React Navigation 6.x
- React Native Reanimated
- React Native Gesture Handler

### Storage & Database
- Expo SQLite (Local database)
- Expo SecureStore (Encrypted storage)
- Date-fns (Date handling)

### Features
- 100% Offline functionality
- Encrypted local storage
- No external dependencies
- APK deployment ready

## 📂 Project Structure

```
ironlog-gym-tracker/
├── App.js                          # Main entry point
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
├── babel.config.js                 # Babel configuration
└── src/
    ├── navigation/
    │   └── AppNavigator.js         # Navigation setup
    ├── screens/
    │   ├── HomeScreen.js           # Dashboard
    │   ├── ExerciseLibraryScreen.js # Exercise browser
    │   ├── WorkoutPlanScreen.js    # Plan management
    │   ├── GymSessionScreen.js     # Start workout
    │   ├── SessionTrackerScreen.js # Active session
    │   ├── HistoryScreen.js        # Past workouts
    │   ├── ProfileScreen.js        # User profile
    │   ├── ExerciseDetailScreen.js # Exercise details
    │   ├── PlanBuilderScreen.js    # Create plans
    │   ├── SessionDetailScreen.js  # Session details
    │   └── ReportsScreen.js        # Analytics
    ├── database/
    │   ├── schema.js               # Database schema & init
    │   └── exerciseData.js         # 400+ exercise seed data
    ├── services/
    │   ├── exerciseService.js      # Exercise operations
    │   ├── workoutPlanService.js   # Plan operations
    │   ├── sessionService.js       # Session operations
    │   └── profileService.js       # Profile & analytics
    └── utils/
        └── theme.js                # Colors, spacing, styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- For Android: Android Studio & Android SDK
- For iOS: Xcode (macOS only)

### Installation

1. **Clone or extract the project**
   ```bash
   cd ironlog-gym-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on device/simulator**
   - Press `a` for Android
   - Press `i` for iOS (macOS only)
   - Scan QR code with Expo Go app

### Building APK

**For Android:**

1. **Development Build**
   ```bash
   expo build:android -t apk
   ```

2. **Production Build (EAS)**
   ```bash
   npm install -g eas-cli
   eas build --platform android
   ```

3. **Local Build**
   ```bash
   expo prebuild
   cd android
   ./gradlew assembleRelease
   ```

## 📊 Database Schema

### Tables

1. **user_profile** - User information
2. **exercises** - Exercise library (400+ exercises)
3. **workout_plans** - User's workout plans
4. **plan_days** - Days within plans
5. **plan_exercises** - Exercises assigned to days
6. **workout_sessions** - Gym session records
7. **cardio_records** - Cardio/treadmill data
8. **exercise_performance** - Sets, reps, weight logs
9. **weekly_reports** - Analytics summaries

## 🎯 Usage Guide

### 1. First Launch
- App initializes database
- Seeds 400+ exercises
- Ready to use!

### 2. Create Workout Plan
1. Navigate to "Plans" tab
2. Tap "Create New Plan"
3. Add days (e.g., Push, Pull, Legs)
4. Add exercises to each day
5. Set as active plan

### 3. Start Workout
1. Go to "Workout" tab
2. Choose "Quick Start" or select a plan day
3. Log exercises, sets, reps, weight
4. Add cardio if needed
5. Finish workout

### 4. Track Progress
- View "History" for past workouts
- Check "Reports" for analytics
- See stats on Home dashboard

## 🔒 Security

- All data stored locally
- SQLite database with encryption support
- No external API calls
- No user data transmission
- Fully offline operation

## 🎨 Customization

### Theme Colors
Edit `src/utils/theme.js`:
```javascript
export const COLORS = {
  primary: '#FF6B35',  // Change accent color
  accent: '#00D9FF',   // Change secondary color
  // ... more colors
};
```

### Add More Exercises
Edit `src/database/exerciseData.js` and add to array:
```javascript
{ 
  name: 'Your Exercise', 
  target_muscle: 'Chest', 
  category: 'Push', 
  difficulty: 'Intermediate', 
  equipment: 'Barbell' 
}
```

## 🐛 Troubleshooting

### Database not initializing
- Clear app data
- Reinstall app
- Check console logs

### App crashes on start
- Ensure all dependencies installed: `npm install`
- Clear cache: `expo start -c`
- Check Node version (18+)

### Exercises not loading
- Check database initialization in App.js
- Verify exerciseData.js format
- Check console for errors

## 📈 Future Enhancements

- [ ] Video player for exercise form
- [ ] Progress graphs and charts
- [ ] Exercise GIF/image library
- [ ] Cloud backup (optional)
- [ ] Export workout data
- [ ] Import/export workout plans
- [ ] Voice logging
- [ ] Wearable integration
- [ ] AI workout suggestions
- [ ] Nutrition tracking

## 🤝 Contributing

This is a personal project, but suggestions welcome!

## 📄 License

MIT License - Free to use and modify

## 🙏 Acknowledgments

- Exercise data curated from scientific fitness sources
- UI/UX inspired by modern fitness apps
- Built for offline-first gym tracking

---

**Made with 💪 for serious lifters**

Need help? Check the code comments or create an issue!
