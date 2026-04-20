import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AgentDecision,
  ChatMessage,
  FatigueLevel,
  ProgressMetrics,
  UserProfile,
  WorkoutPlan,
  WorkoutSession,
} from '../models';


@Injectable({ providedIn: 'root' })
export class StateService {
  

  private readonly _user = new BehaviorSubject<UserProfile | null>(null);
  private readonly _workoutPlan = new BehaviorSubject<WorkoutPlan | null>(null);
  private readonly _session = new BehaviorSubject<WorkoutSession | null>(null);
  private readonly _fatigue = new BehaviorSubject<FatigueLevel>({
    score: 0,
    trend: 'stable',
    lastUpdated: new Date(),
    recommendation: 'train',
  });
  private readonly _progress = new BehaviorSubject<ProgressMetrics>({
    weeklyConsistency: 0,
    volumeProgression: 0,
    fatigueAverage: 0,
    sessionsCompleted: 0,
    streak: 0,
    lastUpdated: new Date(),
  });
  private readonly _aiResponse = new BehaviorSubject<string>('');
  private readonly _isLoading = new BehaviorSubject<boolean>(false);
  private readonly _agentDecisions = new BehaviorSubject<AgentDecision[]>([]);
  private readonly _chatMessages = new BehaviorSubject<ChatMessage[]>([]);
  private readonly _error = new BehaviorSubject<string | null>(null);

  

  readonly user$: Observable<UserProfile | null> = this._user.asObservable();
  readonly workoutPlan$: Observable<WorkoutPlan | null> = this._workoutPlan.asObservable();
  readonly session$: Observable<WorkoutSession | null> = this._session.asObservable();
  readonly fatigue$: Observable<FatigueLevel> = this._fatigue.asObservable();
  readonly progress$: Observable<ProgressMetrics> = this._progress.asObservable();
  readonly aiResponse$: Observable<string> = this._aiResponse.asObservable();
  readonly isLoading$: Observable<boolean> = this._isLoading.asObservable();
  readonly agentDecisions$: Observable<AgentDecision[]> = this._agentDecisions.asObservable();
  readonly chatMessages$: Observable<ChatMessage[]> = this._chatMessages.asObservable();
  readonly error$: Observable<string | null> = this._error.asObservable();

  

  getCurrentUser(): UserProfile | null {
    return this._user.getValue();
  }

  getCurrentWorkoutPlan(): WorkoutPlan | null {
    return this._workoutPlan.getValue();
  }

  getCurrentSession(): WorkoutSession | null {
    return this._session.getValue();
  }

  getCurrentFatigue(): FatigueLevel {
    return this._fatigue.getValue();
  }

  getCurrentProgress(): ProgressMetrics {
    return this._progress.getValue();
  }

  

  setUser(user: UserProfile | null): void {
    this._user.next(user);
  }

  setWorkoutPlan(plan: WorkoutPlan | null): void {
    this._workoutPlan.next(plan);
  }

  setSession(session: WorkoutSession | null): void {
    this._session.next(session);
  }

  setFatigue(fatigue: FatigueLevel): void {
    this._fatigue.next(fatigue);
  }

  setProgress(progress: ProgressMetrics): void {
    this._progress.next(progress);
  }

  setAiResponse(response: string): void {
    this._aiResponse.next(response);
  }

  setLoading(isLoading: boolean): void {
    this._isLoading.next(isLoading);
  }

  setError(error: string | null): void {
    this._error.next(error);
  }

  

  addAgentDecision(decision: AgentDecision): void {
    const current = this._agentDecisions.getValue();
    
    
    
    queueMicrotask(() => {
      this._agentDecisions.next([decision, ...current].slice(0, 50));
    });
  }

  clearAgentDecisions(): void {
    this._agentDecisions.next([]);
  }

  

  addChatMessage(message: ChatMessage): void {
    const current = this._chatMessages.getValue();
    this._chatMessages.next([...current, message]);
  }

  
  updateLastChatMessage(content: string, isStreaming: boolean = false): void {
    const current = this._chatMessages.getValue();
    if (current.length === 0) return;
    const updated = [...current];
    updated[updated.length - 1] = { ...updated[updated.length - 1], content, isStreaming };
    this._chatMessages.next(updated);
  }

  clearChatMessages(): void {
    this._chatMessages.next([]);
  }
}

