import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { switchMap, tap, catchError, EMPTY } from 'rxjs';
import { StateService } from '../state/state.service';
import { AiService } from '../services/ai.service';
import { FirestoreService } from '../services/firestore.service';
import { AgentDecision, UserProfile } from '../models';

/**
 * PlannerAgent — responsible for generating workout plans.
 *
 * Architecture:
 *  - Subscribes to its own internal trigger$ stream (not the user$ directly).
 *  - External callers fire `requestPlan(user)` to trigger generation.
 *  - On success: pushes plan to StateService, emits structured AgentDecision.
 *  - Does NOT call other agents directly — all communication is via state streams.
 */
@Injectable({ providedIn: 'root' })
export class PlannerAgent implements OnDestroy {
  private readonly state = inject(StateService);
  private readonly aiService = inject(AiService);
  private readonly firestore = inject(FirestoreService);

  private readonly subscriptions = new Subscription();

  // Internal command stream — thin wrapper that keeps Subjects private
  private readonly _trigger$ = new Subject<UserProfile>();

  constructor() {
    this.initStream();
  }

  // ─── Public Command Interface ─────────────────────────────────────────────

  /** Dispatched by components/other services — triggers plan generation */
  requestPlan(user: UserProfile): void {
    this._trigger$.next(user);
  }

  // ─── Stream Logic ─────────────────────────────────────────────────────────

  private initStream(): void {
    const sub = this._trigger$
      .pipe(
        tap(() => {
          this.state.setLoading(true);
          this.state.setError(null);
          this.emitDecision(
            'User requested a new workout plan',
            'Initiating AI plan generation with current user profile',
          );
        }),
        // switchMap cancels any in-flight request if a new one arrives
        switchMap((user) =>
          this.aiService.generateWorkout(user).pipe(
            catchError((err) => {
              this.state.setError(err.message);
              this.state.setLoading(false);
              this.emitDecision('Plan generation failed', `Error: ${err.message}`, {
                error: err.message,
              });
              return EMPTY;
            }),
          ),
        ),
        tap((plan) => {
          this.state.setWorkoutPlan(plan);
          this.state.setLoading(false);
          this.emitDecision(
            `Generated ${plan.days.filter((d) => !d.isRestDay).length}-day training plan`,
            `Plan covers ${plan.estimatedWeeklyMinutes} minutes/week at ${plan.fitnessLevel} level`,
            { planId: plan.id, weekNumber: plan.weekNumber },
          );

          // Persist to Firestore (fire-and-forget — does not block UI)
          const user = this.state.getCurrentUser();
          if (user) {
            this.firestore.saveWorkoutPlan(plan).subscribe();
          }
        }),
      )
      .subscribe();

    this.subscriptions.add(sub);
  }

  // ─── Decision Emitter ─────────────────────────────────────────────────────

  private emitDecision(
    reason: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): void {
    const decision: AgentDecision = {
      id: crypto.randomUUID(),
      agentName: 'PlannerAgent',
      timestamp: new Date(),
      reason,
      action,
      metadata,
    };
    this.state.addAgentDecision(decision);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this._trigger$.complete();
  }
}
