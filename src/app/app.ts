import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { StateService } from './core/state/state.service';
import { AuthService } from './core/services/auth.service';
import { PersistenceAgent } from './core/agents/persistence.agent';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly state = inject(StateService);
  private readonly auth = inject(AuthService);
  private readonly persistence = inject(PersistenceAgent);
  private readonly router = inject(Router);

  readonly user$ = this.state.user$;
  readonly workoutPlan$ = this.state.workoutPlan$;
  readonly isLoading$ = this.state.isLoading$;
  readonly agentDecisions$ = this.state.agentDecisions$;
  readonly fatigue$ = this.state.fatigue$;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects)
    )
  );

  isLoginPage = computed(() => this.url()?.includes('/login') ?? true);
  
  isSidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

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

