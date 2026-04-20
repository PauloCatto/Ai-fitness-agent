import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models';
import { StateService } from '../state/state.service';

/**
 * AuthService — Firebase Authentication ONLY.
 * Does not touch Firestore or application state beyond the current user.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth: import('firebase/auth').Auth | null = null;

  constructor(private readonly state: StateService) {}

  private async getAuth(): Promise<import('firebase/auth').Auth> {
    if (this.auth) return this.auth;

    const { getAuth } = await import('firebase/auth');
    this.auth = getAuth();
    return this.auth;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  signInWithGoogle(): Observable<UserProfile> {
    if (!this.isFirebaseConfigured()) {
      return throwError(() => new Error('Firebase not configured. Use Demo Mode.'));
    }

    return from(this.googleSignIn()).pipe(
      map((fbUser) => this.mapFirebaseUser(fbUser)),
      catchError((err) => throwError(() => new Error(`Sign-in failed: ${err.message}`))),
    );
  }

  signInWithEmail(email: string, password: string): Observable<UserProfile> {
    if (!this.isFirebaseConfigured()) {
      return throwError(() => new Error('Firebase not configured. Use Demo Mode.'));
    }

    return from(this.emailSignIn(email, password)).pipe(
      map((fbUser) => this.mapFirebaseUser(fbUser)),
      catchError((err) => throwError(() => new Error(`Sign-in failed: ${err.message}`))),
    );
  }

  signOut(): Observable<void> {
    if (!this.isFirebaseConfigured()) {
      this.state.setUser(null);
      return of(undefined);
    }

    return from(
      this.getAuth().then(async (auth) => {
        const { signOut } = await import('firebase/auth');
        return signOut(auth);
      }),
    );
  }

  /** Activates demo mode — sets a mock user without Firebase */
  signInAsDemo(): void {
    const demoUser: UserProfile = {
      uid: 'demo-user-001',
      displayName: 'Demo Athlete',
      email: 'demo@ai-fitness-agent.dev',
      photoURL: undefined,
      fitnessLevel: 'intermediate',
      goals: ['muscle gain', 'strength', 'endurance'],
      createdAt: new Date(),
      preferences: {
        daysPerWeek: 5,
        sessionDurationMinutes: 55,
        availableEquipment: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
        focusAreas: ['chest', 'back', 'legs', 'core'],
      },
    };
    this.state.setUser(demoUser);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async googleSignIn(): Promise<import('firebase/auth').User> {
    const auth = await this.getAuth();
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  private async emailSignIn(
    email: string,
    password: string,
  ): Promise<import('firebase/auth').User> {
    const auth = await this.getAuth();
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  private mapFirebaseUser(fbUser: import('firebase/auth').User): UserProfile {
    return {
      uid: fbUser.uid,
      displayName: fbUser.displayName ?? 'Athlete',
      email: fbUser.email ?? '',
      photoURL: fbUser.photoURL ?? undefined,
      fitnessLevel: 'intermediate',
      goals: ['general fitness'],
      createdAt: new Date(),
      preferences: {
        daysPerWeek: 4,
        sessionDurationMinutes: 45,
        availableEquipment: ['barbell', 'dumbbell', 'bodyweight'],
        focusAreas: ['chest', 'back', 'legs'],
      },
    };
  }

  private isFirebaseConfigured(): boolean {
    return (
      environment.firebase.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
      environment.firebase.apiKey.length > 0
    );
  }
}
