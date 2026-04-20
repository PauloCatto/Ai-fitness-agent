import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { StateService } from './core/state/state.service';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly state = inject(StateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user$ = this.state.user$;
  readonly workoutPlan$ = this.state.workoutPlan$;
  readonly isLoading$ = this.state.isLoading$;
  readonly agentDecisions$ = this.state.agentDecisions$;
  readonly fatigue$ = this.state.fatigue$;

  signOut(): void {
    this.auth.signOut().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  getFatigueLabel(score: number): string {
    if (score >= 8) return '🔴';
    if (score >= 5) return '🟡';
    return '🟢';
  }
}
