import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { StateService } from '../../core/state/state.service';
import { FirestoreService } from '../../core/services/firestore.service';
import { PlannerAgent } from '../../core/agents/planner.agent';
import { GoalType, FitnessLevel, PhysicalLimitation, UserProfile } from '../../core/models';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent {
  private readonly state = inject(StateService);
  private readonly firestore = inject(FirestoreService);
  private readonly planner = inject(PlannerAgent);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);


  readonly totalSteps = 5;
  readonly currentStep = signal(1);
  readonly isLoading = signal(false);

  readonly progressPercent = computed(() =>
    Math.round(((this.currentStep() - 1) / this.totalSteps) * 100),
  );


  readonly nameCtrl = new FormControl<string>('', Validators.required);
  readonly ageCtrl = new FormControl<number | null>(null, [Validators.required, Validators.min(13), Validators.max(100)]);
  readonly weightCtrl = new FormControl<number | null>(null, [Validators.required, Validators.min(30), Validators.max(300)]);


  readonly goals: { value: GoalType; label: string; icon: string; description: string }[] = [
    { value: 'hypertrophy', label: 'Hipertrofia', icon: '💪', description: 'Ganhar massa muscular' },
    { value: 'strength', label: 'Força', icon: '🏋️', description: 'Aumentar carga nos exercícios' },
    { value: 'weight_loss', label: 'Emagrecimento', icon: '🔥', description: 'Perder gordura corporal' },
    { value: 'endurance', label: 'Resistência', icon: '🏃', description: 'Melhorar condicionamento' },
  ];

  readonly goalCtrl = new FormControl<GoalType | null>(null, Validators.required);


  readonly levels: { value: FitnessLevel; label: string; icon: string; description: string }[] = [
    { value: 'beginner', label: 'Iniciante', icon: '🌱', description: 'Até 6 meses de treino' },
    { value: 'intermediate', label: 'Intermediário', icon: '⚡', description: '6 meses a 2 anos' },
    { value: 'advanced', label: 'Avançado', icon: '🔥', description: 'Mais de 2 anos' },
  ];

  readonly levelCtrl = new FormControl<FitnessLevel | null>(null, Validators.required);


  readonly frequencies = [2, 3, 4, 5, 6];
  readonly daysCtrl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(2),
    Validators.max(6),
  ]);


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

  submit(): void {
    const base = this.state.getCurrentUser();
    if (!base) return;

    this.isLoading.set(true);

    const profile: UserProfile = {
      ...base,
      displayName: this.nameCtrl.value!,
      fitnessLevel: this.levelCtrl.value!,
      goal: this.goalCtrl.value!,
      goals: [this.goalCtrl.value!],
      age: this.ageCtrl.value!,
      weight: this.weightCtrl.value!,
      limitations: [...this.selectedLimitations],
      injuries: this.injuriesCtrl.value?.trim() ?? '',
      onboardingCompleted: true,
      preferences: {
        daysPerWeek: this.daysCtrl.value!,
        sessionDurationMinutes: 60,
        availableEquipment: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
        focusAreas: ['chest', 'back', 'legs', 'core'],
      },
    };

    this.state.setUser(profile);
    this.firestore.saveUserProfile(profile).subscribe();
    this.planner.requestPlan(profile);
    this.router.navigate(['/workout']);
  }
}

