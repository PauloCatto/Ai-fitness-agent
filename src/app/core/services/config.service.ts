import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiService } from './api.service';
import { WorkoutOptionsResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly api = inject(ApiService);

  private options$ = this.api.get<WorkoutOptionsResponse>('/config/workout-options').pipe(
    shareReplay(1)
  );

  getWorkoutOptions(): Observable<WorkoutOptionsResponse> {
    return this.options$;
  }
}
