import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExerciseCardComponent } from './exercise-card.component';
import { Exercise } from '../../../core/models';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ExerciseCardComponent', () => {
  let component: ExerciseCardComponent;
  let fixture: ComponentFixture<ExerciseCardComponent>;

  const mockExercise: Exercise = {
    id: '1',
    name: 'Flexão de Braço',
    difficulty: 'beginner',
    muscleGroups: ['chest', 'triceps'],
    sets: 3,
    reps: '10-15',
    restSeconds: 60,
    instructions: 'Realize uma flexão completa mantendo o corpo reto.',
    equipment: ['bodyweight'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExerciseCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExerciseCardComponent);
    component = fixture.componentInstance;
    component.exercise = mockExercise;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com isExpanded = false', () => {
    expect(component.isExpanded).toBe(false);
  });

  it('deve alternar isExpanded ao chamar toggle()', () => {
    component.toggle();
    expect(component.isExpanded).toBe(true);
    component.toggle();
    expect(component.isExpanded).toBe(false);
  });

  it('deve exibir o nome do exercício no template', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.exercise-name')?.textContent).toContain('Flexão de Braço');
  });

  it('deve exibir sets e reps no template', () => {
    const el = fixture.nativeElement as HTMLElement;
    const text = el.querySelector('.sets-reps')?.textContent ?? '';
    expect(text).toContain('3');
    expect(text).toContain('10-15');
  });

  it('deve mostrar o card-body apenas quando expandido', () => {
    expect(fixture.nativeElement.querySelector('.card-body')).toBeNull();
    component.toggle();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.card-body')).toBeTruthy();
  });

  it('deve exibir instruções ao expandir', () => {
    component.toggle();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).querySelector('.instructions-text')?.textContent;
    expect(text).toContain('Realize uma flexão');
  });
});

