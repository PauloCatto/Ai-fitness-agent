import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
    canActivate: [authGuard],
  },
  {
    path: 'workout',
    loadComponent: () =>
      import('./features/workout/workout.component').then((m) => m.WorkoutComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat.component').then((m) => m.ChatComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];

