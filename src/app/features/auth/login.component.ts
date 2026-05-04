import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/state/state.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly state = inject(StateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isLoading: boolean = false;
  errorMessage: string = '';
  authMode: AuthMode = 'register';

  readonly features: { icon: string; title: string; desc: string }[] = [
    { icon: '🧠', title: 'IA Personalizada', desc: 'Planos adaptados ao seu corpo e objetivos' },
    { icon: '📈', title: 'Progresso Real', desc: 'Métricas de evolução e fadiga em tempo real' },
    { icon: '💬', title: 'Coach Virtual', desc: 'Orientações inteligentes a qualquer hora' },
  ];

  ngOnInit(): void {
    if (this.state.getCurrentUser()) {
      this.router.navigate(['/workout']);
    }
    this.switchMode('register');
  }

  switchMode(mode: AuthMode): void {
    this.authMode = mode;
    this.errorMessage = '';
  }

  enterDemoMode(): void {
    this.auth.signInAsDemo();
    this.router.navigate(['/workout']);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;

    const authObs = this.authMode === 'register'
      ? this.auth.register('Atleta', email!, password!)
      : this.auth.login(email!, password!);

    authObs.pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (user) => {
        if (this.authMode === 'register') {
          this.toast.show('🎉 Conta criada com sucesso! Faça seu login.', 'success');
          this.form.reset();
          this.switchMode('login');
        } else {
          if (!user.onboardingCompleted) {
            this.router.navigate(['/onboarding']);
          } else {
            this.router.navigate(['/workout']);
          }
        }
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.toast.show(err.message, 'error');
      },
    });
  }

  get emailInvalid(): boolean {
    const c = this.form.get('email');
    return !!(c?.invalid && c?.touched);
  }

  get passwordInvalid(): boolean {
    const c = this.form.get('password');
    return !!(c?.invalid && c?.touched);
  }
}
