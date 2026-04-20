import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { StateService } from '../../core/state/state.service';
import { PlannerAgent } from '../../core/agents/planner.agent';
import { ProgressAgent } from '../../core/agents/progress.agent';
import { ExerciseCardComponent } from '../../shared/components/exercise-card/exercise-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { WorkoutDay, WorkoutSession, SessionFeedback } from '../../core/models';

@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ExerciseCardComponent, LoadingSpinnerComponent, DurationPipe],
  templateUrl: './workout.component.html',
  styleUrl: './workout.component.scss',
})
export class WorkoutComponent implements OnInit {
  // Read-only stream bindings — no business logic here
  private readonly state = inject(StateService);
  private readonly plannerAgent = inject(PlannerAgent);
  private readonly progressAgent = inject(ProgressAgent);

  readonly plan$ = this.state.workoutPlan$;
  readonly isLoading$ = this.state.isLoading$;
  readonly error$ = this.state.error$;
  readonly fatigue$ = this.state.fatigue$;
  readonly user$ = this.state.user$;

  selectedDayIndex = 0;
  showReasoning = false;
  sessionFeedbackSent = false;

  ngOnInit(): void {
    // Auto-generate plan if none exists
    const user = this.state.getCurrentUser();
    const plan = this.state.getCurrentWorkoutPlan();
    if (user && !plan) {
      this.plannerAgent.requestPlan(user);
    }
  }

  // ─── User Actions (dispatched to agents) ──────────────────────────────────

  generatePlan(): void {
    const user = this.state.getCurrentUser();
    if (user) this.plannerAgent.requestPlan(user);
  }

  selectDay(index: number): void {
    this.selectedDayIndex = index;
    this.sessionFeedbackSent = false;
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
      completedExerciseIds: plan.days[this.selectedDayIndex]?.exercises.map((e) => e.id) ?? [],
      durationMinutes: plan.days[this.selectedDayIndex]?.estimatedMinutes ?? 0,
    };

    this.state.setSession(session);
    this.sessionFeedbackSent = true;
  }

  toggleReasoning(): void {
    this.showReasoning = !this.showReasoning;
  }

  // ─── View Helpers ──────────────────────────────────────────────────────────

  getSelectedDay(days: WorkoutDay[]): WorkoutDay | null {
    return days[this.selectedDayIndex] ?? null;
  }

  getTrainingDaysCount(days: WorkoutDay[]): number {
    return days.filter((d) => !d.isRestDay).length;
  }

  trackByDay(_: number, day: WorkoutDay): number {
    return day.day;
  }
}
