import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserProfile, WorkoutPlan, WorkoutSession } from '../models';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private db: import('firebase/firestore').Firestore | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    if (!this.isConfigured()) return;
    const { getFirestore } = await import('firebase/firestore');
    this.db = getFirestore();
  }

  private async getDb(): Promise<import('firebase/firestore').Firestore | null> {
    if (this.db) return this.db;
    if (!this.isConfigured()) return null;
    const { getFirestore } = await import('firebase/firestore');
    this.db = getFirestore();
    return this.db;
  }

  saveUserProfile(profile: UserProfile): Observable<void> {
    if (!this.isConfigured()) return of(undefined);

    return from(
      this.getDb().then(async (db) => {
        if (!db) throw new Error('Firestore not initialized');
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', profile.uid), this.toFirestore(profile));
      }),
    ).pipe(catchError(() => of(undefined)));
  }

  loadUserProfile(uid: string): Observable<UserProfile | null> {
    if (!this.isConfigured()) return of(null);

    return from(
      this.getDb().then(async (db) => {
        if (!db) return null;
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? (snap.data() as UserProfile) : null;
      }),
    ).pipe(catchError(() => of(null)));
  }

  saveWorkoutPlan(plan: WorkoutPlan): Observable<void> {
    if (!this.isConfigured()) return of(undefined);

    return from(
      this.getDb().then(async (db) => {
        if (!db) throw new Error('Firestore not initialized');
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'workoutPlans', plan.id), this.toFirestore(plan));
      }),
    ).pipe(catchError(() => of(undefined)));
  }

  loadLatestWorkoutPlan(userId: string): Observable<WorkoutPlan | null> {
    if (!this.isConfigured()) return of(null);

    return from(
      this.getDb().then(async (db) => {
        if (!db) return null;
        const { collection, query, where, orderBy, limit, getDocs } = await import(
          'firebase/firestore'
        );
        const q = query(
          collection(db, 'workoutPlans'),
          where('userId', '==', userId),
          orderBy('generatedAt', 'desc'),
          limit(1),
        );
        const snap = await getDocs(q);
        return snap.empty ? null : (snap.docs[0].data() as WorkoutPlan);
      }),
    ).pipe(catchError(() => of(null)));
  }

  saveSession(session: WorkoutSession): Observable<void> {
    if (!this.isConfigured()) return of(undefined);

    return from(
      this.getDb().then(async (db) => {
        if (!db) throw new Error('Firestore not initialized');
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'sessions', session.id), this.toFirestore(session));
      }),
    ).pipe(catchError(() => of(undefined)));
  }

  loadRecentSessions(userId: string, limit_: number = 10): Observable<WorkoutSession[]> {
    if (!this.isConfigured()) return of([]);

    return from(
      this.getDb().then(async (db) => {
        if (!db) return [];
        const { collection, query, where, orderBy, limit, getDocs } = await import(
          'firebase/firestore'
        );
        const q = query(
          collection(db, 'sessions'),
          where('userId', '==', userId),
          orderBy('date', 'desc'),
          limit(limit_),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as WorkoutSession);
      }),
    ).pipe(catchError(() => of([])));
  }

  private toFirestore(obj: unknown): Record<string, unknown> {
    return JSON.parse(
      JSON.stringify(obj, (_key, value) =>
        value instanceof Date ? value.toISOString() : value,
      ),
    );
  }

  private isConfigured(): boolean {
    return (
      environment.firebase.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
      environment.firebase.projectId !== 'YOUR_PROJECT_ID'
    );
  }
}

