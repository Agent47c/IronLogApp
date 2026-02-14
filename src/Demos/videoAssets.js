export const VIDEO_ASSETS = {
    "Barbell Bench Press": require('./Barbell Bench Press.mp4'),
    "Barbell Squat": require('./Barbell Squat.mp4'),
    "Bayesian Curl": require('./Bayesian Curl.mp4'),
    "Behind The Back Cable Lateral Raises": require('./Behind The Back Cable Lateral Raises.mp4'),
    "Cable Lateral Raises": require('./Cable Lateral Raises.mp4'),
    "Chest Supported Row 1": require('./Chest Supported Row 1.mp4'),
    "Chest Supported Row": require('./Chest Supported Row.mp4'),
    "Decline Cable Flyes": require('./Decline Cable Flyes.mp4'),
    "Dumbbell Bench Press": require('./Dumbbell Bench Press.mp4'),
    "Dumbbell Preacher Hammer Curls": require('./Dumbbell Preacher Hammer Curls.mp4'),
    "EZ Bar Curl": require('./EZ Bar Curl.mp4'),
    "Face Pulls": require('./Face Pulls.mp4'),
    "Hack Squat": require('./Hack Squat.mp4'),
    "Hammer Curl": require('./Hammer Curl.mp4'),
    "Hyperextensions": require('./Hyperextensions.mp4'),
    "Incline Barbell Bench Press": require('./Incline Barbell Bench Press.mp4'),
    "Incline Dumbbell Bench Press": require('./Incline Dumbbell Bench Press.mp4'),
    "Lat Pulldown": require('./Lat Pulldown.mp4'),
    "Lateral Raises": require('./Lateral Raises.mp4'),
    "Leg Extension": require('./Leg Extension.mp4'),
    "Machine Preacher Curl": require('./Machine Preacher Curl.mp4'),
    "Machine Shoulder Press": require('./Machine Shoulder Press.mp4'),
    "Neutral Grip Pull-Ups": require('./Neutral Grip Pull-Ups.mp4'),
    "One Arm Half Kneeling Pull Down": require('./One Arm Half Kneeling Pull Down.mp4'),
    "Overhead Cable Extension": require('./Overhead Cable Extension.mp4'),
    "Overhead Tricep Extension": require('./Overhead Tricep Extension.mp4'),
    "Preacher Curl": require('./Preacher Curl.mp4'),
    "Reverse Cable Crossover": require('./Reverse Cable Crossover.mp4'),
    "Reverse Pec Deck": require('./Reverse Pec Deck.mp4'),
    "Seated Calf Raise": require('./Seated Calf Raise.mp4'),
    "Single Arm Cable Pushdown": require('./Single Arm Cable Pushdown.mp4'),
    "Single Arm Overhead Tricep Extension": require('./Single Arm Overhead Tricep Extension.mp4'),
    "Standing Calf Raise": require('./Standing Calf Raise.mp4'),
    "Tricep Kickbacks": require('./Tricep Kickbacks.mp4'),
    "Tricep Pushdown": require('./Tricep Pushdown.mp4'),
    "V-Bar Pushdown": require('./V-Bar Pushdown.mp4'),
    "Zottman Curl": require('./Zottman Curl.mp4')
};

/**
 * Look up demo videos for an exercise by name.
 * Handles the " 1" suffix convention for exercises with two video angles.
 * @param {string} exerciseName 
 * @returns {Array} Array of require() video sources (0, 1, or 2 entries)
 */
export function getVideosForExercise(exerciseName) {
    const videos = [];
    if (VIDEO_ASSETS[exerciseName]) {
        videos.push(VIDEO_ASSETS[exerciseName]);
    }
    if (VIDEO_ASSETS[`${exerciseName} 1`]) {
        videos.push(VIDEO_ASSETS[`${exerciseName} 1`]);
    }
    return videos;
}
