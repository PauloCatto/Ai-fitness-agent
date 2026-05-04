import { Injectable, inject } from '@angular/core';
import { StateService } from '../state/state.service';
import { skip, tap, filter, delay } from 'rxjs/operators';
import { UserProfile, WorkoutPlan, WorkoutSession } from '../models';

@Injectable({ providedIn: 'root' })
export class PersistenceAgent {
  private readonly state = inject(StateService);
  private readonly STORAGE_KEY = 'ai_fitness_agent_data';

  constructor() {
    this.init();
    this.setupAutoSave();
  }

  private init(): void {
    const localData = localStorage.getItem(this.STORAGE_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed.user) this.state.setUser(this.reviveDates(parsed.user));
        if (parsed.plan) this.state.setWorkoutPlan(this.reviveDates(parsed.plan));
        if (parsed.progress) this.state.setProgress(this.reviveDates(parsed.progress));
        if (parsed.fatigue) this.state.setFatigue(this.reviveDates(parsed.fatigue));
      } catch (e) {
        console.error('Falha ao restaurar dados locais:', e);
      }
    }
  }

  private setupAutoSave(): void {
    this.state.state$.pipe(skip(1)).subscribe((state) => {
      const data = {
        user: state.user,
        plan: state.workoutPlan,
        progress: state.progress,
        fatigue: state.fatigue,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    });
  }

  private reviveDates(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.reviveDates(item));
    }

    const res = { ...obj };
    Object.keys(res).forEach(key => {
      const val = res[key];
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        res[key] = new Date(val);
      } else if (typeof val === 'object' && val !== null) {
        res[key] = this.reviveDates(val);
      }
    });
    return res;
  }
}
