import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { StateService } from '../../core/state/state.service';
import { PlannerAgent } from '../../core/agents/planner.agent';
import { ExerciseCardComponent } from '../../shared/components/exercise-card/exercise-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { TimerPipe } from '../../shared/pipes/timer.pipe';
import { WorkoutDay, WorkoutSession, SessionFeedback, GoalType, FitnessLevel, UserProfile, PhysicalLimitation, MuscleGroup, Exercise } from '../../core/models';
import { WorkoutOption } from '../../core/models/api.models';
import { UserService } from '../../core/services/user.service';
import { AiService } from '../../core/services/ai.service';

@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    DurationPipe,
    TimerPipe,
    ExerciseCardComponent
  ],
  templateUrl: './workout.component.html',
  styleUrl: './workout.component.scss',
})
export class WorkoutComponent implements OnInit {
  private readonly state = inject(StateService);
  private readonly plannerAgent = inject(PlannerAgent);
  private readonly userService = inject(UserService);
  private readonly aiService = inject(AiService);
  private readonly fb = inject(FormBuilder);

  readonly plan$ = this.state.workoutPlan$;
  readonly isLoading$ = this.state.isLoading$;
  readonly error$ = this.state.error$;
  readonly fatigue$ = this.state.fatigue$;
  readonly user$ = this.state.user$;

  selectedDayIndex: number = 0;
  showReasoning: boolean = false;
  sessionFeedbackSent: boolean = false;
  isEditingProfile: boolean = false;
  isRegenerating: boolean = false;
  completedExerciseIds = new Set<string>();
  reasoningText: string = '';
  isExplaining: boolean = false;
  isTrainingActive: boolean = false;
  trainingStartTime: number | null = null;
  elapsedTime: number = 0;
  private timerSubscription?: Subscription;

  isSwapping: boolean = false;
  currentSessionId: string = crypto.randomUUID();

  workoutSplits: WorkoutOption[] = [];
  availableMuscleGroups: WorkoutOption[] = [];

  readonly availableLimitations: PhysicalLimitation[] = ['joelho', 'ombro', 'lombar', 'quadril', 'tornozelo', 'cervical', 'punho'];
  readonly profileForm = this.fb.group({
    displayName: ['', Validators.required],
    age: [0, [Validators.required, Validators.min(13), Validators.max(100)]],
    weight: [0, [Validators.required, Validators.min(30), Validators.max(300)]],
    goal: ['' as GoalType, Validators.required],
    fitnessLevel: ['' as FitnessLevel, Validators.required],
    daysPerWeek: [0, [Validators.required, Validators.min(2), Validators.max(6)]],
    workoutSplit: ['ai_choice', Validators.required],
    focusAreas: [[] as string[]],
    cardioMinutes: [0, [Validators.required, Validators.min(0), Validators.max(60)]],
    limitations: [[] as PhysicalLimitation[]],
  });

  selectedRestTime: number = 60;
  readonly restOptions = [
    { value: 30, label: '30 seg (Curto)' },
    { value: 45, label: '45 seg (Médio)' },
    { value: 60, label: '60 seg (Padrão)' },
    { value: 90, label: '90 seg (Longo)' },
    { value: 120, label: '120 seg (Pesado)' },
  ];

  ngOnInit(): void {
    this.userService.getWorkoutOptions().subscribe(options => {
      this.workoutSplits = options.splits;
      this.availableMuscleGroups = options.muscleGroups;
    });

    const user = this.state.getCurrentUser();
    const plan = this.state.getCurrentWorkoutPlan();
    if (user && !plan) {
      this.plannerAgent.requestPlan(user);
    }
  }

  generatePlan(): void {
    const user = this.state.getCurrentUser();
    if (user) {
      this.isRegenerating = true;
      this.profileForm.patchValue({
        workoutSplit: user.preferences?.workoutSplit || 'ai_choice',
        focusAreas: user.preferences?.focusAreas || [],
      });
    }
  }

  confirmRegeneration(): void {
    const user = this.state.getCurrentUser();
    if (!user) return;

    const updated: UserProfile = {
      ...user,
      preferences: {
        ...user.preferences,
        workoutSplit: this.profileForm.value.workoutSplit!,
        focusAreas: (this.profileForm.value.focusAreas as any[]) || [],
      },
    };

    this.state.setUser(updated);
    this.plannerAgent.requestPlan(updated);
    this.isRegenerating = false;
  }

  cancelRegeneration(): void {
    this.isRegenerating = false;
  }

  toggleFocusArea(muscleValue: string): void {
    const current = this.profileForm.value.focusAreas || [];
    let updated: string[];
    if (current.includes(muscleValue)) {
      updated = current.filter(m => m !== muscleValue);
    } else {
      updated = [...current, muscleValue];
    }
    this.profileForm.patchValue({ focusAreas: updated });
  }

  isFocusAreaSelected(muscle: string): boolean {
    const current = this.profileForm.value.focusAreas || [];
    return (current as string[]).includes(muscle);
  }

  selectDay(index: number): void {
    this.selectedDayIndex = index;
    this.sessionFeedbackSent = false;
    this.completedExerciseIds.clear();
  }

  toggleExercise(exerciseId: string): void {
    const isNowCompleted = !this.completedExerciseIds.has(exerciseId);

    if (isNowCompleted) {
      this.completedExerciseIds.add(exerciseId);
    } else {
      this.completedExerciseIds.delete(exerciseId);
    }

    if (this.isTrainingActive) {
      this.saveCurrentSession();
    }
  }

  isExerciseCompleted(exerciseId: string): boolean {
    return this.completedExerciseIds.has(exerciseId);
  }

  getCompletionProgress(day: WorkoutDay): number {
    if (!day || day.exercises.length === 0) return 0;
    const completed = day.exercises.filter(e => this.completedExerciseIds.has(e.id)).length;
    return Math.round((completed / day.exercises.length) * 100);
  }

  submitFeedback(feedback: SessionFeedback): void {
    const plan = this.state.getCurrentWorkoutPlan();
    const user = this.state.getCurrentUser();
    if (!plan || !user) return;

    const session: WorkoutSession = {
      id: this.currentSessionId,
      planId: plan.id,
      userId: user.uid,
      date: new Date(),
      dayIndex: this.selectedDayIndex,
      feedback,
      completedExerciseIds: Array.from(this.completedExerciseIds),
      durationMinutes: Math.ceil(this.elapsedTime / 60),
    };

    this.userService.saveSession(session).subscribe({
      next: () => {
        this.sessionFeedbackSent = true;
        this.finishWorkout();
      },
      error: (err) => console.error('Erro ao finalizar sessão:', err)
    });
  }

  startWorkout(): void {
    this.isTrainingActive = true;
    this.currentSessionId = crypto.randomUUID();
    this.trainingStartTime = Date.now();
    this.elapsedTime = 0;
    this.sessionFeedbackSent = false;
    this.completedExerciseIds.clear();

    const user = this.state.getCurrentUser();
    if (user) {
      const updated: UserProfile = {
        ...user,
        preferences: {
          ...user.preferences,
          defaultRestSeconds: this.selectedRestTime
        }
      };
      this.state.setUser(updated);
      this.userService.updateProfile({
        ...updated,
        workoutSplit: updated.preferences.workoutSplit!,
        focusAreas: updated.preferences.focusAreas!,
        cardioMinutes: updated.preferences.cardioMinutes!,
        daysPerWeek: updated.preferences.daysPerWeek,
        defaultRestSeconds: updated.preferences.defaultRestSeconds
      } as any).subscribe();
    }

    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.trainingStartTime) {
        this.elapsedTime = Math.floor((Date.now() - this.trainingStartTime) / 1000);
      }
    });
  }

  finishWorkout(): void {
    if (this.isTrainingActive) {
      this.saveCurrentSession();
    }
    this.isTrainingActive = false;
    this.timerSubscription?.unsubscribe();
  }

  swapExercise(oldExercise: Exercise): void {
    const user = this.state.getCurrentUser();
    const plan = this.state.getCurrentWorkoutPlan();
    if (!user || !plan || this.isSwapping) return;

    this.isSwapping = true;
    this.aiService.suggestAlternative(oldExercise, user).subscribe({
      next: (newExercise) => {
        const updatedPlan = { ...plan };
        const day = updatedPlan.days[this.selectedDayIndex];
        if (day) {
          const index = day.exercises.findIndex(e => e.id === oldExercise.id);
          if (index !== -1) {
            day.exercises[index] = newExercise;
            this.state.setWorkoutPlan(updatedPlan);
          }
        }
        this.isSwapping = false;
      },
      error: () => {
        this.isSwapping = false;
        alert('Não foi possível trocar o exercício no momento.');
      }
    });
  }

  private saveCurrentSession(feedback?: SessionFeedback): void {
    const plan = this.state.getCurrentWorkoutPlan();
    if (!plan) return;

    const session: WorkoutSession = {
      id: this.currentSessionId,
      planId: plan.id,
      userId: this.state.getCurrentUser()?.uid || '',
      date: new Date(),
      dayIndex: this.selectedDayIndex,
      feedback: feedback,
      completedExerciseIds: Array.from(this.completedExerciseIds),
      durationMinutes: Math.ceil(this.elapsedTime / 60),
    };

    this.userService.saveSession(session).subscribe({
      error: (err) => console.error('Erro ao salvar sessão no backend:', err)
    });
  }

  toggleReasoning(): void {
    this.showReasoning = !this.showReasoning;

    if (this.showReasoning && !this.reasoningText) {
      const plan = this.state.getCurrentWorkoutPlan();
      if (plan) {
        this.isExplaining = true;
        this.reasoningText = '';
        this.aiService.explainWorkout(plan).subscribe({
          next: (chunk) => {
            if (chunk) {
              this.reasoningText += chunk;
            }
          },
          complete: () => {
            this.isExplaining = false;
          },
          error: (err) => {
            console.error('Erro no streaming:', err);
            this.isExplaining = false;
            if (!this.reasoningText) {
              this.reasoningText = 'Falha ao gerar explicação detalhada.';
            }
          }
        });
      }
    }
  }

  toggleEdit(): void {
    const user = this.state.getCurrentUser();
    if (!user) return;

    if (!this.isEditingProfile) {
      this.profileForm.patchValue({
        displayName: user.displayName,
        age: user.age,
        weight: user.weight,
        goal: user.goal,
        fitnessLevel: user.fitnessLevel,
        limitations: user.limitations || [],
        daysPerWeek: user.preferences?.daysPerWeek || 3,
        workoutSplit: user.preferences?.workoutSplit || 'ai_choice',
        focusAreas: user.preferences?.focusAreas || [],
        cardioMinutes: user.preferences?.cardioMinutes || 0,
      });
    }

    this.isEditingProfile = !this.isEditingProfile;
  }

  saveProfile(): void {
    const user = this.state.getCurrentUser();
    if (!user || this.profileForm.invalid) return;

    const updated: UserProfile = {
      ...user,
      displayName: this.profileForm.value.displayName!,
      age: this.profileForm.value.age!,
      weight: this.profileForm.value.weight!,
      goal: this.profileForm.value.goal!,
      fitnessLevel: this.profileForm.value.fitnessLevel!,
      preferences: {
        ...user.preferences,
        daysPerWeek: this.profileForm.value.daysPerWeek!,
        workoutSplit: this.profileForm.value.workoutSplit!,
        focusAreas: (this.profileForm.value.focusAreas as any[]) || [],
        cardioMinutes: this.profileForm.value.cardioMinutes!,
      },
      limitations: this.profileForm.value.limitations || [],
    };

    this.state.setUser(updated);
    this.userService.updateProfile({
      displayName: updated.displayName,
      age: updated.age,
      weight: updated.weight,
      goal: updated.goal,
      fitnessLevel: updated.fitnessLevel,
      daysPerWeek: updated.preferences.daysPerWeek,
      limitations: updated.limitations,
      injuries: updated.injuries,
      workoutSplit: updated.preferences.workoutSplit!,
      focusAreas: updated.preferences.focusAreas!,
      cardioMinutes: updated.preferences.cardioMinutes!
    }).subscribe();
    this.plannerAgent.requestPlan(updated);
    this.isEditingProfile = false;
  }

  isLimitationSelected(lim: PhysicalLimitation): boolean {
    const current = this.profileForm.value.limitations || [];
    return (current as string[]).includes(lim);
  }

  toggleLimitation(lim: PhysicalLimitation): void {
    const current = this.profileForm.value.limitations || [];
    let updated: PhysicalLimitation[];

    if (current.includes(lim)) {
      updated = current.filter(l => l !== lim);
    } else {
      updated = [...current, lim];
    }

    this.profileForm.patchValue({ limitations: updated });
  }

  getSelectedDay(days: any): WorkoutDay | null {
    if (!Array.isArray(days)) return null;
    return days[this.selectedDayIndex] ?? null;
  }

  getTrainingDaysCount(days: any): number {
    if (!Array.isArray(days)) return 0;
    return days.filter((d) => !d.isRestDay).length;
  }

  trackByDay(_: number, day: WorkoutDay): number {
    return day.day;
  }

  getGoalLabel(goal: string): string {
    const goals: Record<string, string> = {
      hypertrophy: 'Hipertrofia',
      strength: 'Força',
      weight_loss: 'Emagrecimento',
      endurance: 'Resistência',
    };
    return goals[goal] || goal;
  }

  getFitnessLevelLabel(level: string): string {
    const levels: Record<string, string> = {
      beginner: 'Iniciante',
      intermediate: 'Intermediário',
      advanced: 'Avançado',
    };
    return levels[level] || level;
  }
}

