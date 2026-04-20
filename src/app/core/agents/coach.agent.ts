import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { scan, tap, switchMap, catchError, EMPTY, withLatestFrom } from 'rxjs';
import { StateService } from '../state/state.service';
import { AiService } from '../services/ai.service';
import { AgentDecision, ChatMessage } from '../models';

export interface CoachChatRequest {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CoachAgent implements OnDestroy {
  private readonly state = inject(StateService);
  private readonly aiService = inject(AiService);

  private readonly subscriptions = new Subscription();
  private readonly _message$ = new Subject<CoachChatRequest>();

  constructor() {
    this.initChatStream();
  }

  sendMessage(message: string): void {
    if (!message.trim()) return;
    this._message$.next({ message });
  }

  private initChatStream(): void {
    const sub = this._message$
      .pipe(
        tap(({ message }) => {
          const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: message,
            timestamp: new Date(),
          };
          this.state.addChatMessage(userMsg);

          const assistantPlaceholder: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          };
          this.state.addChatMessage(assistantPlaceholder);

          this.emitDecision(
            `Usuário perguntou: "${message.substring(0, 60)}..."`,
            'Transmitindo resposta do coach via IA',
            { messageLength: message.length },
          );
        }),
        withLatestFrom(this.state.workoutPlan$, this.state.user$),
        switchMap(([{ message }, plan, user]) => {
          const context = this.buildContext(plan, user);

          return this.aiService.chat(message, context).pipe(
            scan((accumulated, chunk) => accumulated + chunk, ''),
            tap((accumulated) => {
              this.state.updateLastChatMessage(accumulated, true);
            }),
            catchError((err) => {
              this.state.updateLastChatMessage(
                `Desculpe, encontrei um erro: ${err.message}`,
                false,
              );
              this.emitDecision('Falha na resposta do coach', err.message);
              return EMPTY;
            }),
          );
        }),
        tap(() => {
          const messages = this.state.getCurrentUser();
        }),
      )
      .subscribe({
        complete: () => {
          this.state.updateLastChatMessage(
            this.getLastAiMessageContent(),
            false,
          );
        },
      });

    this.subscriptions.add(sub);
  }

  private buildContext(
    plan: import('../models').WorkoutPlan | null,
    user: import('../models').UserProfile | null,
  ): string {
    const parts: string[] = [];
    if (user) parts.push(`Athlete: ${user.displayName}, Level: ${user.fitnessLevel}`);
    if (plan) {
      parts.push(
        `Current Plan: ${plan.days.filter((d) => !d.isRestDay).length} training days/week`,
      );
      parts.push(`Plan Reasoning: ${plan.agentReasoning.substring(0, 200)}`);
    }
    return parts.join('. ');
  }

  private getLastAiMessageContent(): string {
    
    
    return ''; 
  }

  

  private emitDecision(
    reason: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): void {
    const decision: AgentDecision = {
      id: crypto.randomUUID(),
      agentName: 'CoachAgent',
      timestamp: new Date(),
      reason,
      action,
      metadata,
    };
    this.state.addAgentDecision(decision);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this._message$.complete();
  }
}

