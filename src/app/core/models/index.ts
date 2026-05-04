

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type GoalType = 'hypertrophy' | 'strength' | 'weight_loss' | 'endurance';

export type PhysicalLimitation =
  | 'joelho'
  | 'ombro'
  | 'lombar'
  | 'quadril'
  | 'tornozelo'
  | 'cervical'
  | 'punho';

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



export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  fitnessLevel: FitnessLevel;
  goals: string[];
  preferences: WorkoutPreferences;
  createdAt: Date;
  
  onboardingCompleted: boolean;
  goal: GoalType;
  age: number;
  weight: number;
  limitations: PhysicalLimitation[];
  injuries: string;
}

export interface WorkoutPreferences {
  daysPerWeek: number;
  sessionDurationMinutes: number;
  availableEquipment: Equipment[];
  focusAreas: MuscleGroup[];
}



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
  day: number; 
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
  score: number; 
  trend: 'increasing' | 'stable' | 'decreasing';
  lastUpdated: Date;
  recommendation: 'train' | 'light_session' | 'rest';
}

export interface ProgressMetrics {
  weeklyConsistency: number; 
  volumeProgression: number; 
  fatigueAverage: number;
  sessionsCompleted: number;
  streak: number; 
  lastUpdated: Date;
}




export interface AgentDecision {
  id: string;
  agentName: AgentName;
  timestamp: Date;
  reason: string;
  action: string;
  metadata?: Record<string, unknown>;
}



export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}




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


export interface OnboardingPayload {
  displayName: string;
  age: number;
  weight: number;
  goal: string;
  fitnessLevel: string;
  limitations: string[];
  injuries: string;
  daysPerWeek: number;
}

export interface AuthResponse {
  token: string;
  user: { 
    id: string; 
    email: string; 
    displayName: string;
    onboardingCompleted: boolean;
    age?: number;
    weight?: number;
    goal?: string;
    fitnessLevel?: string;
    daysPerWeek?: number;
    limitations?: string[];
    injuries?: string;
  };
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CoachChatRequest {
  message: string;
}
