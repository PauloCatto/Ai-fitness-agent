import { Component, inject, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/state/state.service';
import { CoachAgent } from '../../core/agents/coach.agent';
import { ConversationService } from '../../core/services/conversation.service';
import { Conversation, ChatMessage } from '../../core/models';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, AsyncPipe, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  private readonly state = inject(StateService);
  private readonly coachAgent = inject(CoachAgent);
  private readonly conversationService = inject(ConversationService);
  readonly messages$ = this.state.chatMessages$;
  readonly isLoading$ = this.state.isLoading$;
  conversations: Conversation[] = [];
  activeConversationId: string | null = null;
  conversationIdToDelete: string | null = null;
  isDeleting: boolean = false;
  inputMessage: string = '';
  private shouldScrollToBottom: boolean = false;

  readonly sampleQuestions = [
    'Como posso melhorar minha postura no agachamento?',
    'O que devo comer antes do treino?',
    'Quanto descanso preciso entre as séries?',
    'Pode me explicar o que é sobrecarga progressiva?',
  ];

  ngOnInit(): void {
    this.loadConversations();
  }

  loadConversations(): void {
    this.conversationService.getConversations().subscribe(list => {
      this.conversations = list;
      if (list.length > 0 && !this.activeConversationId) {
        this.selectConversation(list[0].id);
      }
    });
  }

  selectConversation(id: string): void {
    this.activeConversationId = id;
    this.state.clearChatMessages();
    this.conversationService.getMessages(id).subscribe(msgs => {
      msgs.forEach(m => {
        this.state.addChatMessage({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt)
        });
      });
      this.shouldScrollToBottom = true;
    });
  }

  startNewChat(): void {
    this.activeConversationId = null;
    this.state.clearChatMessages();
  }

  sendMessage(): void {
    if (!this.inputMessage.trim()) return;
    const msg = this.inputMessage.trim();
    this.inputMessage = '';
    this.shouldScrollToBottom = true;
    if (!this.activeConversationId) {
      const title = msg.length > 30 ? msg.substring(0, 27) + '...' : msg;
      this.conversationService.createConversation(title).subscribe(conv => {
        this.activeConversationId = conv.id;
        this.conversations.unshift(conv);
        this.coachAgent.sendMessage(msg, conv.id);
      });
    } else {
      this.coachAgent.sendMessage(msg, this.activeConversationId);
    }
  }

  sendSample(question: string): void {
    this.inputMessage = question;
    this.sendMessage();
  }

  confirmDelete(event: Event, id: string): void {
    event.stopPropagation();
    this.conversationIdToDelete = id;
  }

  cancelDelete(): void {
    this.conversationIdToDelete = null;
  }

  executeDelete(): void {
    if (!this.conversationIdToDelete) return;
    this.isDeleting = true;
    const id = this.conversationIdToDelete;
    this.conversationService.deleteConversation(id).subscribe({
      next: () => {
        this.conversations = this.conversations.filter(c => c.id !== id);
        if (this.activeConversationId === id) this.startNewChat();
        this.isDeleting = false;
        this.conversationIdToDelete = null;
      },
      error: () => {
        this.isDeleting = false;
      }
    });
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
    } catch { }
  }
}
