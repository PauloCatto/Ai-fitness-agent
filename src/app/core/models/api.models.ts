import { HttpHeaders, HttpParams } from '@angular/common/http';

export interface HttpOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  observe?: 'body';
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  reportProgress?: boolean;
  responseType?: 'json';
  withCredentials?: boolean;
}

export interface WorkoutOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface WorkoutOptionsResponse {
  goals: WorkoutOption[];
  levels: WorkoutOption[];
  splits: WorkoutOption[];
  muscleGroups: WorkoutOption[];
}
