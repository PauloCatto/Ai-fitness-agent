import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatComponent } from './chat.component';
import { StateService } from '../../core/state/state.service';
import { CoachAgent } from '../../core/agents/coach.agent';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;

  const stateServiceMock = {
    chatMessages$: of([]),
    isLoading$: of(false),
  };

  const coachAgentMock = { sendMessage: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: CoachAgent, useValue: coachAgentMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com inputMessage vazio', () => {
    expect(component.inputMessage).toBe('');
  });

  it('não deve enviar mensagem quando inputMessage está vazio', () => {
    component.inputMessage = '';
    component.sendMessage();
    expect(coachAgentMock.sendMessage).not.toHaveBeenCalled();
  });

  it('deve limpar inputMessage após envio', () => {
    component.inputMessage = 'Como melhorar meu agachamento?';
    component.sendMessage();
    expect(component.inputMessage).toBe('');
  });

  it('deve chamar coachAgent.sendMessage com a mensagem correta', () => {
    component.inputMessage = 'Quantas séries devo fazer?';
    component.sendMessage();
    expect(coachAgentMock.sendMessage).toHaveBeenCalledWith('Quantas séries devo fazer?');
  });

  it('deve enviar pergunta de exemplo ao clicar', () => {
    const pergunta = 'Como me alimentar antes do treino?';
    component.sendSample(pergunta);
    expect(coachAgentMock.sendMessage).toHaveBeenCalledWith(pergunta);
  });
});

