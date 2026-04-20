import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';
import { describe, it, expect, beforeEach } from 'vitest';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve ter fullscreen = false por padrão', () => {
    expect(component.fullscreen).toBe(false);
  });

  it('não deve exibir mensagem quando não fornecida', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.spinner-message')).toBeNull();
  });

  it('deve exibir a mensagem quando fornecida', () => {
    component.message = 'Carregando plano...';
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.spinner-message')?.textContent).toContain('Carregando plano...');
  });

  it('deve aplicar a classe fullscreen quando fullscreen = true', () => {
    component.fullscreen = true;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.spinner-wrapper.fullscreen')).toBeTruthy();
  });

  it('não deve aplicar a classe fullscreen por padrão', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.spinner-wrapper.fullscreen')).toBeNull();
  });
});

