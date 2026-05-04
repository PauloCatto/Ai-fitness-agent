import { Injectable } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserProfile, AuthResponse } from '../models';
import { StateService } from '../state/state.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'ai_fitness_token';

  constructor(
    private readonly state: StateService,
    private readonly api: ApiService
  ) {}

  login(email: string, password: string): Observable<UserProfile> {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap(res => this.saveSession(res)),
      map(res => this.mapToProfile(res.user)),
      tap(profile => this.state.setUser(profile)),
      catchError(err => throwError(() => new Error(err.message ?? 'Falha no login.')))
    );
  }

  initializeSession(): Observable<UserProfile | null> {
    const token = this.getToken();
    if (!token) return new Observable(obs => { obs.next(null); obs.complete(); });

    return this.api.get<AuthResponse['user']>('/users/profile').pipe(
      map(user => this.mapToProfile(user)),
      tap(profile => this.state.setUser(profile)),
      catchError(() => {
        this.signOut();
        return new Observable<null>(obs => { obs.next(null); obs.complete(); });
      })
    );
  }

  register(displayName: string, email: string, password: string): Observable<UserProfile> {
    return this.api.post<AuthResponse>('/auth/register', { displayName, email, password }).pipe(
      tap(res => this.saveSession(res)),
      map(res => this.mapToProfile(res.user)),
      tap(profile => this.state.setUser(profile)),
      catchError(err => throwError(() => new Error(err.message ?? 'Falha no cadastro.')))
    );
  }

  signOut(): Observable<void> {
    return new Observable(observer => {
      localStorage.removeItem(this.TOKEN_KEY);
      this.state.setUser(null);
      observer.next();
      observer.complete();
    });
  }

  signInAsDemo(): void {
    const demoUser: UserProfile = {
      uid: 'demo-user-001',
      displayName: 'Atleta Demo',
      email: 'demo@ai-fitness-agent.dev',
      photoURL: undefined,
      fitnessLevel: 'intermediate',
      goals: ['hypertrophy'],
      goal: 'hypertrophy',
      age: 30,
      weight: 75,
      limitations: [],
      injuries: '',
      onboardingCompleted: true,
      createdAt: new Date(),
      preferences: {
        daysPerWeek: 4,
        sessionDurationMinutes: 55,
        availableEquipment: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
        focusAreas: ['chest', 'back', 'legs', 'core'],
      },
    };
    this.state.setUser(demoUser);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
  }

  private mapToProfile(user: AuthResponse['user']): UserProfile {
    return {
      uid: user.id,
      displayName: user.displayName,
      email: user.email,
      photoURL: undefined,
      fitnessLevel: (user.fitnessLevel as any) || 'beginner',
      goals: user.goal ? [user.goal as any] : [],
      goal: (user.goal as any) || 'hypertrophy',
      age: user.age || 25,
      weight: user.weight || 70,
      limitations: user.limitations as any || [],
      injuries: user.injuries || '',
      onboardingCompleted: user.onboardingCompleted,
      createdAt: new Date(),
      preferences: {
        daysPerWeek: user.daysPerWeek || 3,
        sessionDurationMinutes: 45,
        availableEquipment: ['bodyweight'],
        focusAreas: [],
      },
    };
  }
}
