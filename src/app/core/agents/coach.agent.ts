import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { scan, tap, switchMap, catchError, EMPTY, withLatestFrom } from 'rxjs';
import { StateService } from '../state/state.service';
import { AiService } from '../services/ai.service';
import { AgentDecision, ChatMessage, CoachChatRequest } from '../models';
import { ConversationService } from '../services/conversation.service';

@Injectable({ providedIn: 'root' })
export class CoachAgent implements OnDestroy {
  private readonly state = inject(StateService);
  private readonly aiService = inject(AiService);
  private readonly conversationService = inject(ConversationService);
  private readonly subscriptions = new Subscription();
  private readonly _message$ = new Subject<CoachChatRequest>();
  private currentConversationId: string | null = null;

  constructor() {
    this.initChatStream();
  }

  sendMessage(message: string, conversationId?: string): void {
    if (!message.trim()) return;
    if (conversationId) this.currentConversationId = conversationId;
    this._message$.next({ message });
  }

  private initChatStream(): void {
    const sub = this._message$.pipe(
      tap(({ message }) => {
        this.state.setLoading(true);
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: message,
          timestamp: new Date(),
        };
        this.state.addChatMessage(userMsg);
      }),
      withLatestFrom(this.state.workoutPlan$, this.state.user$),
      switchMap(([{ message }, plan, user]) => {
        const context = this.buildContext(plan, user);
        let fullResponse = '';
        let isFirstChunk = true;
        return this.aiService.chat(message, context).pipe(
          scan((accumulated, chunk) => accumulated + chunk, ''),
          tap((accumulated) => {
            if (isFirstChunk && accumulated.trim()) {
              this.state.setLoading(false);
              const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true,
              };
              this.state.addChatMessage(assistantMsg);
              isFirstChunk = false;
            }
            fullResponse = accumulated;
            this.state.updateLastChatMessage(accumulated, true);
          }),
          catchError((err) => {
            this.state.setLoading(false);
            this.state.updateLastChatMessage(`Erro: ${err.message}`, false);
            return EMPTY;
          }),
          tap({
            complete: () => {
              this.state.setLoading(false);
              this.state.updateLastChatMessage(fullResponse, false);
              if (this.currentConversationId) {
                this.conversationService.saveMessages(
                  this.currentConversationId,
                  message,
                  fullResponse
                ).subscribe();
              }
            }
          })
        );
      })
    ).subscribe();
    this.subscriptions.add(sub);
  }

  private buildContext(
    plan: import('../models').WorkoutPlan | null,
    user: import('../models').UserProfile | null,
  ): string {
    const parts: string[] = [];
    if (user) parts.push(`Athlete: ${user.displayName}, Level: ${user.fitnessLevel}`);
    if (plan) {
      parts.push(`Current Plan: ${plan.days.filter((d) => !d.isRestDay).length} training days/week`);
      parts.push(`Plan Reasoning: ${plan.agentReasoning.substring(0, 200)}`);
    }
    return parts.join('. ');
  }

  private emitDecision(reason: string, action: string, metadata?: Record<string, unknown>): void {
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
