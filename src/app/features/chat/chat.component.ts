import { Component, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/state/state.service';
import { CoachAgent } from '../../core/agents/coach.agent';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, AsyncPipe, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  private readonly state = inject(StateService);
  private readonly coachAgent = inject(CoachAgent);

  readonly messages$ = this.state.chatMessages$;
  readonly isLoading$ = this.state.isLoading$;

  inputMessage = '';
  private shouldScrollToBottom = false;

  readonly sampleQuestions = [
    'How can I improve my squat form?',
    'What should I eat before a workout?',
    'How much rest do I need between sets?',
    'Can you explain progressive overload?',
  ];

  // ─── User Actions ──────────────────────────────────────────────────────────

  sendMessage(): void {
    if (!this.inputMessage.trim()) return;
    const msg = this.inputMessage.trim();
    this.inputMessage = '';
    this.shouldScrollToBottom = true;
    this.coachAgent.sendMessage(msg);
  }

  sendSample(question: string): void {
    this.coachAgent.sendMessage(question);
    this.shouldScrollToBottom = true;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
