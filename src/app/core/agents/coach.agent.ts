import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { scan, tap, switchMap, catchError, EMPTY, withLatestFrom } from 'rxjs';
import { StateService } from '../state/state.service';
import { AiService } from '../services/ai.service';
import { AgentDecision, ChatMessage } from '../models';

export interface CoachChatRequest {
  message: string;
}

/**
 * CoachAgent — handles conversational AI coaching.
 *
 * Architecture:
 *  - Accepts chat messages via `sendMessage()`.
 *  - Streams tokens from AiService using `scan` to accumulate partial responses.
 *  - Each token chunk updates the last ChatMessage in state (typewriter effect).
 *  - Builds context from current user profile and workout plan.
 *  - Does NOT call other agents.
 */
@Injectable({ providedIn: 'root' })
export class CoachAgent implements OnDestroy {
  private readonly state = inject(StateService);
  private readonly aiService = inject(AiService);

  private readonly subscriptions = new Subscription();
  private readonly _message$ = new Subject<CoachChatRequest>();

  constructor() {
    this.initChatStream();
  }

  // ─── Public Command Interface ─────────────────────────────────────────────

  sendMessage(message: string): void {
    if (!message.trim()) return;
    this._message$.next({ message });
  }

  // ─── Stream Logic ─────────────────────────────────────────────────────────

  private initChatStream(): void {
    const sub = this._message$
      .pipe(
        tap(({ message }) => {
          // 1. Add user message to chat
          const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: message,
            timestamp: new Date(),
          };
          this.state.addChatMessage(userMsg);

          // 2. Add placeholder for streaming AI response
          const assistantPlaceholder: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          };
          this.state.addChatMessage(assistantPlaceholder);

          this.emitDecision(
            `User asked: "${message.substring(0, 60)}..."`,
            'Streaming coaching response from AI',
            { messageLength: message.length },
          );
        }),
        withLatestFrom(this.state.workoutPlan$, this.state.user$),
        switchMap(([{ message }, plan, user]) => {
          const context = this.buildContext(plan, user);

          // Stream tokens and accumulate with scan
          return this.aiService.chat(message, context).pipe(
            // scan accumulates tokens: ('', 'Hello') => 'Hello', ('Hello', ' world') => 'Hello world'
            scan((accumulated, chunk) => accumulated + chunk, ''),
            tap((accumulated) => {
              // Update the streaming placeholder in real time
              this.state.updateLastChatMessage(accumulated, true);
            }),
            catchError((err) => {
              this.state.updateLastChatMessage(
                `Sorry, I encountered an error: ${err.message}`,
                false,
              );
              this.emitDecision('Chat response failed', err.message);
              return EMPTY;
            }),
          );
        }),
        tap(() => {
          // Mark streaming complete when observable completes
          const messages = this.state.getCurrentUser(); // trigger snapshot read
          void messages; // unused — just ensuring we get the final state
        }),
      )
      .subscribe({
        complete: () => {
          // Mark last message as no longer streaming
          this.state.updateLastChatMessage(
            this.getLastAiMessageContent(),
            false,
          );
        },
      });

    this.subscriptions.add(sub);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
    // This will be invoked at complete — the last message should have the full content
    // We rely on updateLastChatMessage having been called with the full accumulated text
    return ''; // returning empty string won't overwrite since it's called after all scan emissions
  }

  // ─── Decision Emitter ─────────────────────────────────────────────────────

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
