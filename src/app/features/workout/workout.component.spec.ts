import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutComponent } from './workout.component';
import { StateService } from '../../core/state/state.service';
import { PlannerAgent } from '../../core/agents/planner.agent';
import { ProgressAgent } from '../../core/agents/progress.agent';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WorkoutComponent', () => {
  let component: WorkoutComponent;
  let fixture: ComponentFixture<WorkoutComponent>;

  const stateServiceMock = {
    workoutPlan$: of(null),
    isLoading$: of(false),
    error$: of(null),
    fatigue$: of({ score: 0, recommendation: 'train' }),
    user$: of(null),
    getCurrentUser: vi.fn().mockReturnValue(null),
    getCurrentWorkoutPlan: vi.fn().mockReturnValue(null),
    setSession: vi.fn(),
  };

  const plannerAgentMock = { requestPlan: vi.fn() };
  const progressAgentMock = { analyzeSession: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: PlannerAgent, useValue: plannerAgentMock },
        { provide: ProgressAgent, useValue: progressAgentMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com selectedDayIndex = 0', () => {
    expect(component.selectedDayIndex).toBe(0);
  });

  it('deve atualizar selectedDayIndex ao selecionar dia', () => {
    component.selectDay(2);
    expect(component.selectedDayIndex).toBe(2);
  });

  it('deve resetar feedback ao selecionar novo dia', () => {
    component.sessionFeedbackSent = true;
    component.selectDay(1);
    expect(component.sessionFeedbackSent).toBe(false);
  });

  it('deve alternar showReasoning ao chamar toggleReasoning()', () => {
    expect(component.showReasoning).toBe(false);
    component.toggleReasoning();
    expect(component.showReasoning).toBe(true);
  });
});

