// ─── Primitive Types ─────────────────────────────────────────────────────────

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'bodyweight'
  | 'machine'
  | 'resistance_bands'
  | 'kettlebell';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'full_body';

export type SessionFeedback = 'too_easy' | 'just_right' | 'too_hard';

export type AgentName = 'PlannerAgent' | 'ProgressAgent' | 'RecoveryAgent' | 'CoachAgent';

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  fitnessLevel: FitnessLevel;
  goals: string[];
  preferences: WorkoutPreferences;
  createdAt: Date;
}

export interface WorkoutPreferences {
  daysPerWeek: number;
  sessionDurationMinutes: number;
  availableEquipment: Equipment[];
  focusAreas: MuscleGroup[];
}

// ─── Workout Plan ─────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  sets: number;
  reps: string;
  restSeconds: number;
  difficulty: FitnessLevel;
  instructions: string;
  tips?: string;
  equipment: Equipment[];
}

export interface WorkoutDay {
  day: number; // 1–7
  label: string;
  focus: string;
  isRestDay: boolean;
  exercises: Exercise[];
  estimatedMinutes: number;
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  generatedAt: Date;
  weekNumber: number;
  fitnessLevel: FitnessLevel;
  days: WorkoutDay[];
  totalVolume: number;
  estimatedWeeklyMinutes: number;
  agentReasoning: string;
}

// ─── Session & Progress ───────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  planId: string;
  userId: string;
  date: Date;
  dayIndex: number;
  feedback: SessionFeedback;
  completedExerciseIds: string[];
  durationMinutes: number;
  notes?: string;
}

export interface FatigueLevel {
  score: number; // 0–10
  trend: 'increasing' | 'stable' | 'decreasing';
  lastUpdated: Date;
  recommendation: 'train' | 'light_session' | 'rest';
}

export interface ProgressMetrics {
  weeklyConsistency: number; // 0–100
  volumeProgression: number; // % change from previous week
  fatigueAverage: number;
  sessionsCompleted: number;
  streak: number; // consecutive training days
  lastUpdated: Date;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

/** Structured decision emitted by every agent — stored in state for UI display */
export interface AgentDecision {
  id: string;
  agentName: AgentName;
  timestamp: Date;
  reason: string;
  action: string;
  metadata?: Record<string, unknown>;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// ─── AI Response DTOs ────────────────────────────────────────────────────────
// Strongly typed shapes expected from Gemini JSON output

export interface AiExerciseDto {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  sets: number;
  reps: string;
  restSeconds: number;
  difficulty: FitnessLevel;
  instructions: string;
  tips?: string;
  equipment: Equipment[];
}

export interface AiWorkoutDayDto {
  day: number;
  label: string;
  focus: string;
  isRestDay: boolean;
  estimatedMinutes: number;
  exercises: AiExerciseDto[];
}

export interface AiWorkoutResponseDto {
  agentReasoning: string;
  fitnessLevel: FitnessLevel;
  totalVolume: number;
  estimatedWeeklyMinutes: number;
  days: AiWorkoutDayDto[];
}
