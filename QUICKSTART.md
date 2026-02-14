# 🚀 Quick Start Guide - IronLog Gym Tracker

## Get Running in 5 Minutes!

### Step 1: Install Dependencies (2 minutes)

```bash
cd ironlog-gym-tracker
npm install
```

### Step 2: Start the App (1 minute)

```bash
npm start
```

This opens Expo DevTools in your browser.

### Step 3: Run on Your Device (2 minutes)

**Option A: Use Your Phone**
1. Install "Expo Go" from Play Store (Android) or App Store (iOS)
2. Scan the QR code shown in terminal/browser
3. App opens on your phone!

**Option B: Use Emulator**
- Press `a` for Android emulator (requires Android Studio)
- Press `i` for iOS simulator (requires Xcode, macOS only)

## First Time Usage

### 1. App Launches
- Database initializes automatically
- 400+ exercises loaded
- Ready to use!

### 2. Create Your First Workout Plan

1. Tap **"Plans"** tab at bottom
2. Tap **"+ Create New Plan"**
3. Name it (e.g., "Push Pull Legs")
4. Add days:
   - Day 1: Push
   - Day 2: Pull
   - Day 3: Legs
5. Add exercises to each day
6. Set as **Active**

### 3. Start Your First Workout

1. Tap **"Workout"** tab
2. Choose a day or **"Quick Start"**
3. Log your sets:
   - Enter reps
   - Enter weight
   - Tap "Log Set"
4. Add more exercises
5. Tap **"Finish Workout"** when done

### 4. Track Your Progress

- **Home** - See stats and calendar
- **History** - View past workouts
- **Reports** - Analytics coming soon

## Tips for Best Experience

### ✅ DO:
- Create a workout plan first
- Log weight for tracking progress
- Complete workouts to save history
- Explore the exercise library
- Mark favorite exercises

### ❌ DON'T:
- Close app mid-workout (it auto-saves but finish properly)
- Worry about internet - fully offline!
- Skip logging weight if you want progress tracking

## Common Questions

**Q: Where is my data stored?**
A: Locally on your device in SQLite database. 100% private and offline.

**Q: Can I edit exercises?**
A: The 400+ preset exercises can't be edited, but you can mark favorites.

**Q: How do I backup my data?**
A: Currently local only. Cloud backup coming in future update.

**Q: Does it work without internet?**
A: Yes! 100% offline. No internet needed ever.

**Q: Can I add custom exercises?**
A: Not in UI yet, but you can edit `src/database/exerciseData.js` and add to the array.

## Need Help?

### App Not Starting?
```bash
# Clear cache and restart
expo start -c
```

### Dependencies Issues?
```bash
# Delete and reinstall
rm -rf node_modules
npm install
```

### Database Issues?
- Uninstall app from device
- Reinstall - database recreates fresh

## Building for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Build APK
eas build --platform android --profile preview

# Download and install APK on device
```

## Next Steps

1. ✅ Create your workout plan
2. ✅ Start tracking workouts
3. ✅ Review your history
4. ✅ Check your stats
5. 🎯 Stay consistent!

---

## Feature Highlights

### 📱 **Exercise Library**
- 400+ exercises pre-loaded
- Search by name
- Filter by muscle group, equipment, category
- Mark favorites

### 📋 **Workout Plans**
- Create unlimited plans
- Support for PPL, Bro Split, Custom
- Multiple days per plan
- Set/Rep targets
- Weekly alternation support

### ⏱️ **Session Tracking**
- Real-time workout logging
- Log sets, reps, weight
- Rest timer (coming soon)
- Cardio tracking
- Auto-save progress

### 📊 **Analytics**
- Total workouts
- Time spent training
- Workout calendar
- Personal records
- Weekly reports (coming soon)

---

**Need more details?** Check `README.md` and `DEVELOPER_GUIDE.md`

**Ready to lift? Let's go! 💪**
