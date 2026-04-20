import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription, interval } from 'rxjs';
import { tap, withLatestFrom, filter, map } from 'rxjs';
import { StateService } from '../state/state.service';
import { AgentDecision, FatigueLevel } from '../models';


@Injectable({ providedIn: 'root' })
export class RecoveryAgent implements OnDestroy {
  private readonly state = inject(StateService);

  private readonly subscriptions = new Subscription();
  private readonly _evaluate$ = new Subject<void>();

  constructor() {
    this.initSessionMonitor();
    this.initManualEvaluation();
  }

  

  
  evaluate(): void {
    this._evaluate$.next();
  }

  

  private initSessionMonitor(): void {
    
    const sub = this.state.session$
      .pipe(
        filter((session) => session !== null),
        withLatestFrom(this.state.progress$),
        map(([session, progress]) => {
          if (!session) return null;
          return this.computeFatigue(progress.sessionsCompleted, session.feedback);
        }),
        filter((fatigue): fatigue is FatigueLevel => fatigue !== null),
        tap((fatigue) => {
          this.state.setFatigue(fatigue);

          const trendMap: Record<string, string> = {
            increasing: 'aumentando',
            stable: 'estável',
            decreasing: 'diminuindo',
          };
          const translatedTrend = trendMap[fatigue.trend] || fatigue.trend;

          this.emitDecision(
            `Índice de fadiga atualizado: ${fatigue.score}/10 (${translatedTrend})`,
            `Recomendação: ${this.formatRecommendation(fatigue.recommendation)}`,
            { score: fatigue.score, trend: fatigue.trend, recommendation: fatigue.recommendation },
          );
        }),
      )
      .subscribe();

    this.subscriptions.add(sub);
  }

  private initManualEvaluation(): void {
    const sub = this._evaluate$
      .pipe(
        withLatestFrom(this.state.progress$, this.state.fatigue$),
        tap(([, progress, currentFatigue]) => {
          const updated = this.computeFatigue(progress.sessionsCompleted, undefined, currentFatigue.score);
          this.state.setFatigue(updated);
          this.emitDecision(
            'Reavaliação manual de fadiga acionada',
            `Recomendação atualizada: ${this.formatRecommendation(updated.recommendation)}`,
          );
        }),
      )
      .subscribe();

    this.subscriptions.add(sub);
  }

  

  private computeFatigue(
    sessionsCompleted: number,
    lastFeedback?: string,
    currentScore: number = 0,
  ): FatigueLevel {
    
    let score = Math.min(10, currentScore + (sessionsCompleted % 3 === 0 ? 2 : 1));

    
    if (lastFeedback === 'too_hard') score = Math.min(10, score + 2);
    if (lastFeedback === 'too_easy') score = Math.max(0, score - 1);
    if (lastFeedback === 'just_right') score = Math.max(0, score - 0.5);

    score = Math.round(score * 10) / 10;

    const trend: FatigueLevel['trend'] =
      score > currentScore + 1 ? 'increasing' : score < currentScore - 0.5 ? 'decreasing' : 'stable';

    const recommendation: FatigueLevel['recommendation'] =
      score >= 8 ? 'rest' : score >= 5 ? 'light_session' : 'train';

    return { score, trend, recommendation, lastUpdated: new Date() };
  }

  private formatRecommendation(rec: FatigueLevel['recommendation']): string {
    const map: Record<FatigueLevel['recommendation'], string> = {
      train: 'Sessão de treino completa recomendada',
      light_session: 'Sessão leve — foco em mobilidade e técnica',
      rest: 'Dia de descanso completo recomendado para evitar overtraining',
    };
    return map[rec];
  }

  

  private emitDecision(
    reason: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): void {
    const decision: AgentDecision = {
      id: crypto.randomUUID(),
      agentName: 'RecoveryAgent',
      timestamp: new Date(),
      reason,
      action,
      metadata,
    };
    this.state.addAgentDecision(decision);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this._evaluate$.complete();
  }
}

