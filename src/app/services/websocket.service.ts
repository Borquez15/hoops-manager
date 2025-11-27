// src/app/services/websocket.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface WebSocketMessage {
  type: 'game_update' | 'standings_update' | 'connection_info' | 'pong';
  data?: any;
  torneo?: number;
  mensaje?: string;
  clientes_conectados?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<WebSocketMessage>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor() {}

  connect(tournamentId: number): Observable<WebSocketMessage> {
    if (this.ws) {
      console.warn('⚠️ Ya existe una conexión WebSocket');
      return this.messageSubject.asObservable();
    }

    const wsUrl = `ws://localhost:8000/tournaments/${tournamentId}/ws`;
    console.log('🔌 Conectando a WebSocket:', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket conectado');
      this.reconnectAttempts = 0;
      
      // Enviar ping cada 30 segundos para mantener viva la conexión
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 Mensaje WebSocket recibido:', message);
        this.messageSubject.next(message);
      } catch (e) {
        console.error('❌ Error parseando mensaje WebSocket:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error);
    };

    this.ws.onclose = (event) => {
      console.log('🔌 WebSocket cerrado:', event.code, event.reason);
      this.ws = null;

      // Intentar reconectar si no fue cierre intencional
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Reintentando conexión (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
          this.connect(tournamentId);
        }, this.reconnectDelay);
      }
    };

    return this.messageSubject.asObservable();
  }

  private startHeartbeat() {
    const heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 30 segundos
  }

  disconnect() {
    if (this.ws) {
      console.log('🔌 Cerrando WebSocket...');
      this.ws.close(1000, 'Cliente cerró la conexión');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}