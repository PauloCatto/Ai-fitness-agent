import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { filter, tap, switchMap, catchError, EMPTY, withLatestFrom } from 'rxjs';
import { StateService } from '../state/state.service';
import { AiService } from '../services/ai.service';
import { FirestoreService } from '../services/firestore.service';
import { AgentDecision, WorkoutPlan, SessionFeedback } from '../models';

/**
 * ProgressAgent — monitors session feedback and adjusts workout difficulty.
 *
 * Architecture:
 *  - Listens to session$ stream (emitted by components after user feedback).
 *  - When feedback arrives, analyzes pattern and triggers plan adjustment.
 *  - Computes progress metrics and pushes to state.
 *  - Does NOT call PlannerAgent — emits to state; PlannerAgent reacts independently if needed.
 */
@Injectable({ providedIn: 'root' })
export class ProgressAgent implements OnDestroy {
  private readonly state = inject(StateService);
  private readonly aiService = inject(AiService);
  private readonly firestore = inject(FirestoreService);

  private readonly subscriptions = new Subscription();

  // Command stream for manual progress recalculation
  private readonly _recalculate$ = new Subject<void>();

  constructor() {
    this.initFeedbackStream();
    this.initRecalculationStream();
  }

  // ─── Public Command Interface ─────────────────────────────────────────────

  /** Trigger a manual recalculation of progress metrics */
  recalculate(): void {
    this._recalculate$.next();
  }

  // ─── Stream Logic ─────────────────────────────────────────────────────────

  private initFeedbackStream(): void {
    // React to every new session that has feedback
    const sub = this.state.session$
      .pipe(
        filter((session) => session !== null && session.feedback !== undefined),
        withLatestFrom(this.state.workoutPlan$),
        tap(([session, plan]) => {
          if (!session || !plan) return;

          this.emitDecision(
            `Session feedback received: "${session.feedback}"`,
            `Analyzing difficulty alignment for Day ${session.dayIndex + 1}`,
            { feedback: session.feedback, dayIndex: session.dayIndex },
          );

          this.updateProgressMetrics(session.feedback, plan);
          this.persistSession();
        }),
        switchMap(([session, plan]) => {
          if (!session || !plan) return EMPTY;
          const shouldAdjust = session.feedback === 'too_easy' || session.feedback === 'too_hard';
          if (!shouldAdjust) return EMPTY;

          const reason =
            session.feedback === 'too_easy'
              ? 'User found workouts too easy — increase intensity and volume'
              : 'User found workouts too hard — reduce intensity and increase rest';

          return this.aiService.adjustWorkout(plan, reason).pipe(
            catchError((err) => {
              this.emitDecision('Plan adjustment failed', err.message);
              return EMPTY;
            }),
          );
        }),
        tap((adjustedPlan) => {
          this.state.setWorkoutPlan(adjustedPlan);
          this.emitDecision(
            'Automatically adjusted workout plan based on session feedback',
            `New plan: Week ${adjustedPlan.weekNumber}, ${adjustedPlan.fitnessLevel} level`,
            { planId: adjustedPlan.id },
          );
        }),
      )
      .subscribe();

    this.subscriptions.add(sub);
  }

  private initRecalculationStream(): void {
    const sub = this._recalculate$
      .pipe(
        withLatestFrom(this.state.session$, this.state.workoutPlan$),
        tap(([, session, plan]) => {
          if (session) this.updateProgressMetrics(session.feedback, plan);
        }),
      )
      .subscribe();

    this.subscriptions.add(sub);
  }

  // ─── Business Logic ───────────────────────────────────────────────────────

  private updateProgressMetrics(feedback: SessionFeedback, plan: WorkoutPlan | null): void {
    const current = this.state.getCurrentProgress();
    const sessionsCompleted = current.sessionsCompleted + 1;
    const totalDays = plan ? plan.days.filter((d) => !d.isRestDay).length : 5;

    const newConsistency = Math.min(100, Math.round((sessionsCompleted / totalDays) * 100));
    const volumeChange =
      feedback === 'too_easy' ? 10 : feedback === 'too_hard' ? -5 : 2;

    this.state.setProgress({
      weeklyConsistency: newConsistency,
      volumeProgression: current.volumeProgression + volumeChange,
      fatigueAverage: this.state.getCurrentFatigue().score,
      sessionsCompleted,
      streak: current.streak + 1,
      lastUpdated: new Date(),
    });
  }

  private persistSession(): void {
    const session = this.state.getCurrentSession();
    if (session) {
      this.firestore.saveSession(session).subscribe();
    }
  }

  // ─── Decision Emitter ─────────────────────────────────────────────────────

  private emitDecision(
    reason: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): void {
    const decision: AgentDecision = {
      id: crypto.randomUUID(),
      agentName: 'ProgressAgent',
      timestamp: new Date(),
      reason,
      action,
      metadata,
    };
    this.state.addAgentDecision(decision);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this._recalculate$.complete();
  }
}
