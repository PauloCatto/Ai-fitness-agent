import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { StateService } from '../../core/state/state.service';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const authServiceMock = {
    signInAsDemo: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
  };

  const stateServiceMock = {
    setUser: vi.fn(),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com showEmailForm = false', () => {
    expect(component.showEmailForm).toBe(false);
  });

  it('deve alternar showEmailForm ao chamar toggleEmailForm()', () => {
    component.toggleEmailForm();
    expect(component.showEmailForm).toBe(true);
    component.toggleEmailForm();
    expect(component.showEmailForm).toBe(false);
  });

  it('deve chamar signInAsDemo ao entrar no modo demo', () => {
    component.enterDemoMode();
    expect(authServiceMock.signInAsDemo).toHaveBeenCalled();
  });

  it('deve exibir o botão "Experimentar Modo Demo"', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#btn-demo-mode')?.textContent).toContain('Experimentar Modo Demo');
  });
});

