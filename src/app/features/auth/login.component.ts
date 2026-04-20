import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/state/state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly state = inject(StateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isLoading: boolean = false;
  errorMessage: string = '';
  showEmailForm: boolean = false;


  enterDemoMode(): void {
    this.auth.signInAsDemo();
    this.router.navigate(['/workout']);
  }

  toggleEmailForm(): void {
    this.showEmailForm = !this.showEmailForm;
    this.errorMessage = '';
  }

  signInWithGoogle(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.auth.signInWithGoogle().subscribe({
      next: (user) => {
        this.state.setUser(user);
        this.router.navigate(['/workout']);
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.isLoading = false;
      },
    });
  }

  signIn(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;
    this.auth.signInWithEmail(email!, password!).subscribe({
      next: (user) => {
        this.state.setUser(user);
        this.router.navigate(['/workout']);
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.isLoading = false;
      },
    });
  }
}

