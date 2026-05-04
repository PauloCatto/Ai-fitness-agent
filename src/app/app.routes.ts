import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then(m => m.OnboardingComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'workout',
    loadComponent: () =>
      import('./features/workout/workout.component').then(m => m.WorkoutComponent),
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat.component').then(m => m.ChatComponent),
  },
  { path: '**', redirectTo: 'login' },
];
