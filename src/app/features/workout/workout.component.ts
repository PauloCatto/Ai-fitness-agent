import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { StateService } from '../../core/state/state.service';
import { PlannerAgent } from '../../core/agents/planner.agent';
import { ProgressAgent } from '../../core/agents/progress.agent';
import { ExerciseCardComponent } from '../../shared/components/exercise-card/exercise-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { WorkoutDay, WorkoutSession, SessionFeedback, GoalType, FitnessLevel, UserProfile, PhysicalLimitation } from '../../core/models';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ReactiveFormsModule, ExerciseCardComponent, LoadingSpinnerComponent, SkeletonComponent, DurationPipe],
  templateUrl: './workout.component.html',
  styleUrl: './workout.component.scss',
})
export class WorkoutComponent implements OnInit {
  private readonly state = inject(StateService);
  private readonly plannerAgent = inject(PlannerAgent);
  private readonly progressAgent = inject(ProgressAgent);
  private readonly userService = inject(UserService);
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
  completedExerciseIds = new Set<string>();

  readonly availableLimitations: PhysicalLimitation[] = ['joelho', 'ombro', 'lombar', 'quadril', 'tornozelo', 'cervical', 'punho'];
  readonly profileForm = this.fb.group({
    displayName: ['', Validators.required],
    age: [0, [Validators.required, Validators.min(13), Validators.max(100)]],
    weight: [0, [Validators.required, Validators.min(30), Validators.max(300)]],
    goal: ['' as GoalType, Validators.required],
    fitnessLevel: ['' as FitnessLevel, Validators.required],
    daysPerWeek: [0, [Validators.required, Validators.min(2), Validators.max(6)]],
    limitations: [[] as PhysicalLimitation[]],
  });

  ngOnInit(): void {
    const user = this.state.getCurrentUser();
    const plan = this.state.getCurrentWorkoutPlan();
    if (user && !plan) {
      this.plannerAgent.requestPlan(user);
    }
  }

  generatePlan(): void {
    const user = this.state.getCurrentUser();
    if (user) this.plannerAgent.requestPlan(user);
  }

  selectDay(index: number): void {
    this.selectedDayIndex = index;
    this.sessionFeedbackSent = false;
    this.completedExerciseIds.clear();
  }

  toggleExercise(exerciseId: string): void {
    if (this.completedExerciseIds.has(exerciseId)) {
      this.completedExerciseIds.delete(exerciseId);
    } else {
      this.completedExerciseIds.add(exerciseId);
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
      id: crypto.randomUUID(),
      planId: plan.id,
      userId: user.uid,
      date: new Date(),
      dayIndex: this.selectedDayIndex,
      feedback,
      completedExerciseIds: Array.from(this.completedExerciseIds),
      durationMinutes: plan.days[this.selectedDayIndex]?.estimatedMinutes ?? 0,
    };

    this.state.setSession(session);
    this.sessionFeedbackSent = true;
  }

  toggleReasoning(): void {
    this.showReasoning = !this.showReasoning;
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
      injuries: updated.injuries
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

