import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Conversation, ConversationMessage } from '../models';
@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/conversations';

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(this.apiUrl);
  }

  createConversation(title: string): Observable<Conversation> {
    return this.http.post<Conversation>(this.apiUrl, { title });
  }

  updateTitle(id: string, title: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/title`, { title });
  }

  getMessages(id: string): Observable<ConversationMessage[]> {
    return this.http.get<ConversationMessage[]>(`${this.apiUrl}/${id}/messages`);
  }

  saveMessages(id: string, userMessage: string, assistantMessage: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/messages`, { userMessage, assistantMessage });
  }

  deleteConversation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
