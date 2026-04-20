import { Component, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { StateService } from '../../core/state/state.service';
import { combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly state = inject(StateService);

  readonly progress$ = this.state.progress$;
  readonly fatigue$ = this.state.fatigue$;
  readonly plan$ = this.state.workoutPlan$;
  readonly agentDecisions$ = this.state.agentDecisions$;

  readonly vm$ = combineLatest([
    this.state.progress$,
    this.state.fatigue$,
    this.state.workoutPlan$,
    this.state.agentDecisions$,
  ]).pipe(
    map(([progress, fatigue, plan, decisions]) => ({
      progress,
      fatigue,
      plan,
      decisions,
      trainingDays: plan?.days.filter((d) => !d.isRestDay).length ?? 0,
      totalExercises: plan?.days.reduce((acc, d) => acc + d.exercises.length, 0) ?? 0,
    })),
  );

  getFatigueColor(score: number): string {
    if (score <= 3) return 'var(--success)';
    if (score <= 6) return 'var(--warning)';
    return 'var(--error)';
  }

  getAgentColor(agentName: string): string {
    const colors: Record<string, string> = {
      PlannerAgent: 'var(--accent)',
      ProgressAgent: 'var(--ai)',
      RecoveryAgent: 'var(--success)',
      CoachAgent: 'var(--warning)',
    };
    return colors[agentName] ?? 'var(--text-3)';
  }

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
