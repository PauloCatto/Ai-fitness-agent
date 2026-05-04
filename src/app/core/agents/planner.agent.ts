import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { switchMap, tap, catchError, EMPTY, filter } from 'rxjs';
import { StateService } from '../state/state.service';
import { AiService } from '../services/ai.service';
import { AgentDecision, UserProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class PlannerAgent implements OnDestroy {
  private readonly state = inject(StateService);
  private readonly aiService = inject(AiService);

  private readonly subscriptions = new Subscription();
  private readonly _trigger$ = new Subject<UserProfile>();

  constructor() {
    this.initStream();
  }
  requestPlan(user: UserProfile): void {
    this._trigger$.next(user);
  }

  private initStream(): void {
    const sub = this._trigger$
      .pipe(
        tap((user) => {
          if (!user.onboardingCompleted) {
            this.emitDecision(
              'Geração de treino bloqueada — onboarding não concluído',
              'Aguardando perfil completo do usuário antes de gerar o plano',
            );
            return;
          }
          this.state.setLoading(true);
          this.state.setError(null);
          this.emitDecision(
            'Usuário solicitou um novo plano de treino',
            'Iniciando geração do plano com IA usando o perfil atual do usuário',
          );
        }),
        filter((user) => user.onboardingCompleted),
        switchMap((user) =>
          this.aiService.generateWorkout(user).pipe(
            catchError((err) => {
              this.state.setError(err.message);
              this.state.setLoading(false);
              this.emitDecision('Falha na geração do plano', `Erro: ${err.message}`, {
                error: err.message,
              });
              return EMPTY;
            }),
          ),
        ),
        tap((plan) => {
          this.state.setWorkoutPlan(plan);
          this.state.setLoading(false);
          const levels: Record<string, string> = {
            beginner: 'iniciante',
            intermediate: 'intermediário',
            advanced: 'avançado',
          };
          const translatedLevel = levels[plan.fitnessLevel] || plan.fitnessLevel;
          this.emitDecision(
            `Plano de treino de ${plan.days.filter((d) => !d.isRestDay).length} dias gerado`,
            `Plano cobre ${plan.estimatedWeeklyMinutes} minutos/semana no nível ${translatedLevel}`,
            { planId: plan.id, weekNumber: plan.weekNumber },
          );
        }),
      )
      .subscribe();

    this.subscriptions.add(sub);
  }

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
