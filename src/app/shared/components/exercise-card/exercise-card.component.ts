import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Exercise } from '../../../core/models';

@Component({
  selector: 'app-exercise-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exercise-card.component.html',
  styleUrl: './exercise-card.component.scss',
})
export class ExerciseCardComponent {
  @Input({ required: true }) exercise!: Exercise;
  @Input() isCompleted: boolean = false;
  @Output() complete = new EventEmitter<void>();

  isExpanded: boolean = false;

  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }

  onComplete(event: Event): void {
    event.stopPropagation();
    this.complete.emit();
  }
}

