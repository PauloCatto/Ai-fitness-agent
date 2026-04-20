import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { StateService } from '../../core/state/state.service';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  const stateServiceMock = {
    progress$: of({
      weeklyConsistency: 80,
      streak: 3,
      sessionsCompleted: 10,
      volumeProgression: 5,
    }),
    fatigue$: of({ score: 2, recommendation: 'train' }),
    workoutPlan$: of(null),
    agentDecisions$: of([]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve retornar cor verde para fadiga baixa (≤ 3)', () => {
    expect(component.getFatigueColor(2)).toBe('var(--success)');
  });

  it('deve retornar cor amarela para fadiga moderada (4–7)', () => {
    expect(component.getFatigueColor(5)).toBe('var(--warning)');
  });

  it('deve retornar cor vermelha para fadiga alta (≥ 8)', () => {
    expect(component.getFatigueColor(9)).toBe('var(--error)');
  });

  it('deve retornar cor do PlannerAgent corretamente', () => {
    expect(component.getAgentColor('PlannerAgent')).toBe('var(--accent)');
  });
});

