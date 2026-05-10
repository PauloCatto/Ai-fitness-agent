import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { StateService } from '../../core/state/state.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { PlannerAgent } from '../../core/agents/planner.agent';
import { GoalType, FitnessLevel, PhysicalLimitation, UserProfile } from '../../core/models';
import { ConfigService } from '../../core/services/config.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent {
  private readonly state = inject(StateService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly planner = inject(PlannerAgent);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly configService = inject(ConfigService);

  readonly options = toSignal(this.configService.getWorkoutOptions());

  readonly totalSteps = 8;
  readonly currentStep = signal(1);
  readonly isLoading = signal(false);

  readonly progressPercent = computed(() =>
    Math.round(((this.currentStep()) / this.totalSteps) * 100),
  );

  readonly nameCtrl = new FormControl<string>('', Validators.required);
  readonly ageCtrl = new FormControl<number | null>(null, [Validators.required, Validators.min(13), Validators.max(100)]);
  readonly weightCtrl = new FormControl<number | null>(null, [Validators.required, Validators.min(30), Validators.max(300)]);

  readonly goalCtrl = new FormControl<GoalType | null>(null, Validators.required);
  readonly levelCtrl = new FormControl<FitnessLevel | null>(null, Validators.required);
  readonly frequencies = [2, 3, 4, 5, 6];
  readonly daysCtrl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(2),
    Validators.max(6),
  ]);

  readonly splitCtrl = new FormControl<string>('ai_choice', Validators.required);
  readonly focusAreasCtrl = new FormControl<string[]>([]);
  readonly cardioCtrl = new FormControl<number>(15, [Validators.required, Validators.min(0), Validators.max(60)]);


  readonly limitationOptions: { value: PhysicalLimitation; label: string }[] = [
    { value: 'joelho', label: 'Joelho' },
    { value: 'ombro', label: 'Ombro' },
    { value: 'lombar', label: 'Lombar / Coluna' },
    { value: 'quadril', label: 'Quadril' },
    { value: 'tornozelo', label: 'Tornozelo' },
    { value: 'cervical', label: 'Cervical / Pescoço' },
    { value: 'punho', label: 'Punho / Cotovelo' },
  ];

  selectedLimitations = new Set<PhysicalLimitation>();
  readonly injuriesCtrl = new FormControl<string>('');

  get canAdvance(): boolean {
    switch (this.currentStep()) {
      case 1: return this.nameCtrl.valid && this.ageCtrl.valid && this.weightCtrl.valid;
      case 2: return this.goalCtrl.valid;
      case 3: return this.levelCtrl.valid;
      case 4: return this.daysCtrl.valid;
      case 5: return true;
      case 6: return this.splitCtrl.valid;
      case 7: return this.cardioCtrl.valid;
      case 8: return true;
      default: return false;
    }
  }

  next(): void {
    if (!this.canAdvance) return;
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
    } else {
      this.submit();
    }
  }

  back(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  toggleLimitation(val: PhysicalLimitation): void {
    if (this.selectedLimitations.has(val)) {
      this.selectedLimitations.delete(val);
    } else {
      this.selectedLimitations.add(val);
    }
  }

  toggleFocusArea(val: string): void {
    const current = this.focusAreasCtrl.value || [];
    if (current.includes(val)) {
      this.focusAreasCtrl.setValue(current.filter(i => i !== val));
    } else {
      this.focusAreasCtrl.setValue([...current, val]);
    }
  }

  submit(): void {
    const base = this.state.getCurrentUser();
    if (!base) return;

    this.isLoading.set(true);

    const payload = {
      displayName: this.nameCtrl.value!,
      age: this.ageCtrl.value!,
      weight: this.weightCtrl.value!,
      goal: this.goalCtrl.value!,
      fitnessLevel: this.levelCtrl.value!,
      limitations: [...this.selectedLimitations],
      injuries: this.injuriesCtrl.value?.trim() ?? '',
      daysPerWeek: this.daysCtrl.value!,
      workoutSplit: this.splitCtrl.value!,
      focusAreas: this.focusAreasCtrl.value || [],
      cardioMinutes: this.cardioCtrl.value!,
    };

    this.userService.saveOnboarding(payload).subscribe({
      next: () => {
        const profile: UserProfile = {
          ...base,
          ...payload,
          goals: [payload.goal as GoalType],
          onboardingCompleted: true,
          preferences: {
            daysPerWeek: payload.daysPerWeek,
            sessionDurationMinutes: 60,
            availableEquipment: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
            focusAreas: (payload.focusAreas as any[]),
            workoutSplit: payload.workoutSplit,
            cardioMinutes: payload.cardioMinutes
          },
        };
        this.state.setUser(profile);
        this.planner.requestPlan(profile);
        this.toast.show('💪 Perfil profissional salvo! Gerando seu plano...', 'success');
        this.router.navigate(['/workout']);
      },
      error: (err) => {
        this.toast.show('Erro ao salvar perfil: ' + err.message, 'error');
        this.isLoading.set(false);
      }
    });
  }
}
