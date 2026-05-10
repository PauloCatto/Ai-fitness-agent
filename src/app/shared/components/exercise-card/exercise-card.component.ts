import { Component, Input, Output, EventEmitter, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Exercise } from '../../../core/models';
import { TimerPipe } from '../../pipes/timer.pipe';
import { interval, Subscription } from 'rxjs';
import { StateService } from '../../../core/state/state.service';

@Component({
  selector: 'app-exercise-card',
  standalone: true,
  imports: [CommonModule, TimerPipe],
  templateUrl: './exercise-card.component.html',
  styleUrl: './exercise-card.component.scss',
})
export class ExerciseCardComponent implements OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly state = inject(StateService);

  @Input({ required: true }) exercise!: Exercise;
  @Input() isCompleted: boolean = false;
  @Input() canSwap: boolean = true;
  @Output() complete = new EventEmitter<void>();
  @Output() swap = new EventEmitter<void>();

  isExpanded: boolean = false;
  isActive: boolean = false;
  currentSet: number = 0;
  isResting: boolean = false;
  isRestOver: boolean = false;
  restTimeLeft: number = 0;
  private restSubscription?: Subscription;

  private readonly translations: Record<string, string> = {
    chest: 'Peito',
    back: 'Costas',
    shoulders: 'Ombros',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    legs: 'Pernas',
    glutes: 'Glúteos',
    core: 'Core/Abdômen',
    full_body: 'Corpo Inteiro',
    barbell: 'Barra',
    dumbbell: 'Halter',
    bodyweight: 'Peso do Corpo',
    machine: 'Máquina',
    resistance_bands: 'Elásticos',
    kettlebell: 'Kettlebell'
  };

  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }

  onComplete(event: Event): void {
    event.stopPropagation();
    this.complete.emit();
  }

  onSwap(event: Event): void {
    event.stopPropagation();
    this.swap.emit();
  }

  startExercise(event: Event): void {
    event.stopPropagation();
    this.isActive = true;
    this.isExpanded = true;
    this.currentSet = 1;
  }

  completeSet(event: Event): void {
    event.stopPropagation();
    if (this.currentSet < this.exercise.sets) {
      this.startRestTimer();
    } else {
      this.finishExercise();
    }
  }

  private startRestTimer(): void {
    this.isResting = true;
    this.isRestOver = false;

    const user = this.state.getCurrentUser();
    this.restTimeLeft = user?.preferences.defaultRestSeconds || this.exercise.restSeconds || 60;

    this.restSubscription?.unsubscribe();

    this.restSubscription = interval(1000)
      .subscribe({
        next: () => {
          if (this.restTimeLeft > 0) {
            this.restTimeLeft--;
            this.cdr.markForCheck();
          } else {
            this.handleRestEnd();
          }
        }
      });
  }

  private handleRestEnd(): void {
    this.isRestOver = true;
    this.playBeep();

    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    this.cdr.markForCheck();
    this.restSubscription?.unsubscribe();
  }

  private playBeep(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio feedback not supported', e);
    }
  }

  stopRestTimer(): void {
    this.isResting = false;
    this.isRestOver = false;
    this.restSubscription?.unsubscribe();
    if (this.currentSet < this.exercise.sets) {
      this.currentSet++;
    }
  }

  private finishExercise(): void {
    this.isActive = false;
    this.isCompleted = true;
    this.complete.emit();
  }

  formatLabel(val: any): string {
    if (!val) return '';
    const key = (typeof val === 'string' ? val : val.value || '').toLowerCase();
    return this.translations[key] || val.toString() || val;
  }

  ngOnDestroy(): void {
    this.restSubscription?.unsubscribe();
  }
}
