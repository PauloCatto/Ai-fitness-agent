import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { OnboardingPayload } from '../models';
import { WorkoutOptionsResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly api: ApiService) { }

  getWorkoutOptions(): Observable<WorkoutOptionsResponse> {
    return this.api.get<WorkoutOptionsResponse>('/config/workout-options');
  }

  saveOnboarding(data: OnboardingPayload): Observable<any> {
    return this.api.post<any>('/users/onboarding', data);
  }

  updateProfile(data: OnboardingPayload): Observable<any> {
    return this.api.put<any>('/users/profile', data);
  }

  getProfile(): Observable<any> {
    return this.api.get<any>('/users/profile');
  }

  saveSession(session: any): Observable<any> {
    return this.api.post<any>('/sessions', session);
  }

  getSessions(): Observable<any[]> {
    return this.api.get<any[]>('/sessions');
  }
}
