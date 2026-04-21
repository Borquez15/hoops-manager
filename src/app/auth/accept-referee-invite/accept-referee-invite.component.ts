// pages/accept-referee-invite/accept-referee-invite.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ApiConfigService } from '../../services/api-config.service';

interface InvitationStatus {
  torneo: string;
  email: string;
  estado: string;
  expira_en: string;
}

@Component({
  selector: 'app-accept-referee-invite',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './accept-referee-invite.component.html',
  styleUrls: ['./accept-referee-invite.component.css']
})
export class AcceptRefereeInviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);  // ✅ AGREGAR
  auth = inject(AuthService);

  private apiConfig = inject(ApiConfigService);

  private apiUrl = this.apiConfig.apiBase;
  token = '';
  loading = true;
  procesando = false;
  
  invitacion: InvitationStatus | null = null;
  error: string | null = null;
  
  isAuthenticated = false;
  currentUserEmail = '';
  emailCoincide = false;
  
  estadoVista: 'cargando' | 'login-requerido' | 'email-diferente' | 'puede-aceptar' | 'error' | 'exito' | 'ya-procesada' = 'cargando';
  
  mensaje = '';

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'];
    
    if (!this.token) {
      this.estadoVista = 'error';
      this.error = 'Token de invitación no encontrado';
      this.loading = false;
      this.cdr.detectChanges();  // ✅ FORZAR
      return;
    }

    console.log('🔵 Token de invitación:', this.token);
    
    this.verificarAutenticacion();
    this.cargarInvitacion();
  }

  private verificarAutenticacion() {
    this.isAuthenticated = this.auth.isAuthenticated();
    
    if (this.isAuthenticated) {
      const user = this.auth.getCurrentUserNative();
      this.currentUserEmail = user?.email || '';
      console.log('✅ Usuario autenticado:', this.currentUserEmail);
    } else {
      console.log('⚠️ Usuario NO autenticado');
    }
  }

  cargarInvitacion() {
    console.log('🔵 Verificando invitación...');
    
    this.http.get<InvitationStatus>(
      `${this.apiUrl}/tournaments/0/referee-invites/check/${this.token}`
    ).subscribe({
      next: (response) => {
        console.log('✅ Respuesta recibida:', response);
        
        this.invitacion = response;
        
        if (this.invitacion.estado !== 'PENDING') {
          this.estadoVista = 'ya-procesada';
          this.mensaje = this.getMensajeEstado(this.invitacion.estado);
          this.loading = false;
          this.cdr.detectChanges();  // ✅ FORZAR
          return;
        }
        
        if (!this.isAuthenticated) {
          this.estadoVista = 'login-requerido';
          this.loading = false;
          this.cdr.detectChanges();  // ✅ FORZAR
          return;
        }
        
        this.emailCoincide = this.currentUserEmail.toLowerCase() === this.invitacion.email.toLowerCase();
        
        if (!this.emailCoincide) {
          this.estadoVista = 'email-diferente';
          this.loading = false;
          this.cdr.detectChanges();  // ✅ FORZAR
          return;
        }
        
        this.estadoVista = 'puede-aceptar';
        this.loading = false;
        this.cdr.detectChanges();  // ✅ FORZAR
        
        console.log('✅ Vista actualizada');
      },
      error: (error: any) => {
        console.error('❌ Error:', error);
        
        this.estadoVista = 'error';
        
        if (error.status === 404) {
          this.error = 'Invitación no encontrada o inválida';
        } else {
          this.error = 'Error al verificar la invitación';
        }
        
        this.loading = false;
        this.cdr.detectChanges();  // ✅ FORZAR
      }
    });
  }

  aceptarInvitacion() {
    if (this.procesando) return;
    
    this.procesando = true;
    
    console.log('🔵 Aceptando invitación...');
    
    this.http.post<any>(
      `${this.apiUrl}/tournaments/0/referee-invites/accept/${this.token}`,
      {}
    ).subscribe({
      next: (response) => {
        console.log('✅ Invitación aceptada:', response);
        
        this.estadoVista = 'exito';
        this.mensaje = `¡Ahora eres árbitro del torneo "${response.torneo_nombre}"!`;
        this.cdr.detectChanges();  // ✅ FORZAR
        
        setTimeout(() => {
          this.router.navigate(['/arbitro']);
        }, 3000);
      },
      error: (error: any) => {
        console.error('❌ Error al aceptar:', error);
        
        this.estadoVista = 'error';
        
        if (error.status === 403) {
          this.error = 'Esta invitación es para otro email';
        } else if (error.status === 400) {
          this.error = error.error?.detail || 'La invitación no es válida';
        } else {
          this.error = 'Error al aceptar la invitación';
        }
        
        this.procesando = false;
        this.cdr.detectChanges();  // ✅ FORZAR
      }
    });
  }

  rechazarInvitacion() {
    if (this.procesando) return;
    
    if (!confirm('¿Estás seguro de que deseas rechazar esta invitación?')) {
      return;
    }
    
    this.procesando = true;
    
    console.log('🔵 Rechazando invitación...');
    
    this.http.post(
      `${this.apiUrl}/tournaments/0/referee-invites/decline/${this.token}`,
      {}
    ).subscribe({
      next: () => {
        console.log('✅ Invitación rechazada');
        
        this.estadoVista = 'ya-procesada';
        this.mensaje = 'Has rechazado la invitación';
        this.cdr.detectChanges();  // ✅ FORZAR
        
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error al rechazar:', error);
        alert('Error al rechazar la invitación');
        this.procesando = false;
        this.cdr.detectChanges();  // ✅ FORZAR
      }
    });
  }

  irALogin() {
    localStorage.setItem('pending_referee_invite', this.token);
    this.router.navigate(['/'], { queryParams: { action: 'login' } });
  }

  irARegistro() {
    localStorage.setItem('pending_referee_invite', this.token);
    this.router.navigate(['/'], { queryParams: { action: 'register' } });
  }

  private getMensajeEstado(estado: string): string {
    switch (estado) {
      case 'ACCEPTED':
        return 'Esta invitación ya fue aceptada';
      case 'DECLINED':
        return 'Esta invitación fue rechazada';
      case 'EXPIRED':
        return 'Esta invitación ha expirado';
      default:
        return 'Esta invitación no está disponible';
    }
  }

  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }
}
