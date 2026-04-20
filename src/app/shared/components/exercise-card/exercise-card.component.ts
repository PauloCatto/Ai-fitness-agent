import { Component, Input } from '@angular/core';
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
  isExpanded: boolean = false;

  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }
}

