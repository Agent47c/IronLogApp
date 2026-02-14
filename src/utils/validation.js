import { z } from 'zod';

// Generic sanitization helper
export const sanitizeString = (str) => {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, ''); // Basic XSS prevention (strip < >)
};

// Exercise Search Schema
export const searchSchema = z.string()
    .max(50, "Search query too long")
    .transform(sanitizeString);

// Workout Plan Schema
export const workoutPlanSchema = z.object({
    name: z.string()
        .min(1, "Plan name is required")
        .max(50, "Plan name must be under 50 characters")
        .transform(sanitizeString),
    description: z.string()
        .max(200, "Description must be under 200 characters")
        .optional()
        .transform(val => val ? sanitizeString(val) : ''),
});

// Session Notes Schema
export const sessionNotesSchema = z.string()
    .max(500, "Notes must be under 500 characters")
    .optional()
    .transform(val => val ? sanitizeString(val) : '');

// Set Performance Schema
export const setPerformanceSchema = z.object({
    reps: z.number().int().min(0).max(999),
    weight: z.number().min(0).max(9999),
});

export const validate = (schema, data) => {
    try {
        return { success: true, data: schema.parse(data) };
    } catch (error) {
        return { success: false, error: error.errors[0].message };
    }
};
