import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { filter, tap, switchMap, catchError, EMPTY, withLatestFrom } from 'rxjs';
import { StateService } from '../state/state.service';
import { AiService } from '../services/ai.service';
import { FirestoreService } from '../services/firestore.service';
import { AgentDecision, WorkoutPlan, SessionFeedback } from '../models';


@Injectable({ providedIn: 'root' })
export class ProgressAgent implements OnDestroy {
  private readonly state = inject(StateService);
  private readonly aiService = inject(AiService);
  private readonly firestore = inject(FirestoreService);

  private readonly subscriptions = new Subscription();

  
  private readonly _recalculate$ = new Subject<void>();

  constructor() {
    this.initFeedbackStream();
    this.initRecalculationStream();
  }

  

  
  recalculate(): void {
    this._recalculate$.next();
  }

  

  private initFeedbackStream(): void {
    
    const sub = this.state.session$
      .pipe(
        filter((session) => session !== null && session.feedback !== undefined),
        withLatestFrom(this.state.workoutPlan$),
        tap(([session, plan]) => {
          if (!session || !plan) return;

          const feedbackMap: Record<string, string> = {
            too_easy: 'muito fácil',
            just_right: 'na medida certa',
            too_hard: 'muito difícil',
          };
          const translatedFeedback = session.feedback ? feedbackMap[session.feedback] || session.feedback : '';

          this.emitDecision(
            `Feedback de sessão recebido: "${translatedFeedback}"`,
            `Analisando alinhamento de dificuldade para o Dia ${session.dayIndex + 1}`,
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
              ? 'Usuário achou o treino fácil demais — aumentar intensidade e volume'
              : 'Usuário achou o treino difícil demais — reduzir intensidade e aumentar descanso';

          return this.aiService.adjustWorkout(plan, reason).pipe(
            catchError((err) => {
              this.emitDecision('Falha no ajuste do plano', err.message);
              return EMPTY;
            }),
          );
        }),
        tap((adjustedPlan) => {
          this.state.setWorkoutPlan(adjustedPlan);
          
          const levels: Record<string, string> = {
            beginner: 'iniciante',
            intermediate: 'intermediário',
            advanced: 'avançado',
          };
          const translatedLevel = levels[adjustedPlan.fitnessLevel] || adjustedPlan.fitnessLevel;

          this.emitDecision(
            'Plano de treino ajustado automaticamente com base no feedback da sessão',
            `Novo plano: Semana ${adjustedPlan.weekNumber}, nível ${translatedLevel}`,
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

