// referee-modal.component.ts
import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Invitation {
  id_inv: number;
  email: string;
  estado: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  enviado_en: string;
  expira_en: string;
  nombre_arbitro?: string;
}

@Component({
  selector: 'app-referee-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './referee-modal.component.html',
  styleUrls: ['./referee-modal.component.css']
})
export class RefereeModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() tournamentId!: number;
  @Output() closeModal = new EventEmitter<void>();
  @Output() refereesUpdated = new EventEmitter<void>();

  private apiUrl = 'https://hoopsbackend-production.up.railway.app';
  
  nuevoArbitroEmail = '';
  enviando = false;
  
  invitaciones: Invitation[] = [];
  cargandoInvitaciones = false;
  
  vistaActual: 'invitar' | 'lista' = 'invitar';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.isOpen) {
      this.cargarInvitaciones();
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  cambiarVista(vista: 'invitar' | 'lista'): void {
    this.vistaActual = vista;
    this.cdr.detectChanges(); // ✅ Forzar actualización
    
    if (vista === 'lista') {
      this.cargarInvitaciones();
    }
  }

  async cargarInvitaciones(): Promise<void> {
    console.log('📡 Cargando invitaciones...');
    
    this.cargandoInvitaciones = true;
    this.cdr.detectChanges(); // ✅ Mostrar spinner
    
    try {
      const response = await this.http.get<Invitation[]>(
        `${this.apiUrl}/tournaments/${this.tournamentId}/referee-invites`
      ).toPromise();
      
      this.invitaciones = response || [];
      console.log('✅ Invitaciones cargadas:', this.invitaciones.length);
      
    } catch (error) {
      console.error('❌ Error al cargar invitaciones:', error);
      this.invitaciones = [];
    } finally {
      this.cargandoInvitaciones = false;
      this.cdr.detectChanges(); // ✅ Forzar actualización
    }
  }

  async enviarInvitacion(): Promise<void> {
    if (!this.nuevoArbitroEmail || !this.nuevoArbitroEmail.includes('@')) {
      alert('❌ Por favor ingresa un email válido');
      return;
    }

    console.log('📤 Enviando invitación a:', this.nuevoArbitroEmail);
    
    this.enviando = true;
    this.cdr.detectChanges(); // ✅ Mostrar estado de carga
    
    try {
      await this.http.post(
        `${this.apiUrl}/tournaments/${this.tournamentId}/referee-invites`,
        { 
          email: this.nuevoArbitroEmail,
          dias_validez: 7 
        }
      ).toPromise();
      
      console.log('✅ Invitación enviada exitosamente');
      alert('✅ Invitación enviada exitosamente');
      
      this.nuevoArbitroEmail = '';
      this.refereesUpdated.emit();
      
      await this.cargarInvitaciones();
      
    } catch (error: any) {
      console.error('❌ Error al enviar invitación:', error);
      
      if (error.status === 409) {
        alert('⚠️ Ya existe una invitación pendiente para este email');
      } else if (error.status === 403) {
        alert('⚠️ No tienes permiso para invitar árbitros');
      } else {
        alert('❌ Error al enviar la invitación. Intenta de nuevo.');
      }
      
    } finally {
      this.enviando = false;
      this.cdr.detectChanges(); // ✅ Forzar actualización
    }
  }

  async eliminarInvitacion(idInv: number): Promise<void> {
    if (!confirm('¿Seguro que deseas cancelar esta invitación?')) {
      return;
    }

    console.log('🗑️ Eliminando invitación:', idInv);

    try {
      await this.http.delete(
        `${this.apiUrl}/tournaments/${this.tournamentId}/referee-invites/${idInv}`
      ).toPromise();
      
      console.log('✅ Invitación cancelada');
      alert('✅ Invitación cancelada');
      
      await this.cargarInvitaciones();
      
    } catch (error) {
      console.error('❌ Error al eliminar invitación:', error);
      alert('❌ Error al cancelar la invitación');
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'PENDING': 'badge-pending',
      'ACCEPTED': 'badge-accepted',
      'DECLINED': 'badge-declined',
      'EXPIRED': 'badge-expired'
    };
    return clases[estado] || '';
  }

  getEstadoTexto(estado: string): string {
    const textos: { [key: string]: string } = {
      'PENDING': 'Pendiente',
      'ACCEPTED': 'Aceptada',
      'DECLINED': 'Rechazada',
      'EXPIRED': 'Expirada'
    };
    return textos[estado] || estado;
  }

  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }

  get invitacionesPendientes(): Invitation[] {
    return this.invitaciones.filter(inv => inv.estado === 'PENDING');
  }

  get invitacionesAceptadas(): Invitation[] {
    return this.invitaciones.filter(inv => inv.estado === 'ACCEPTED');
  }

  get invitacionesRechazadas(): Invitation[] {
    return this.invitaciones.filter(inv => inv.estado === 'DECLINED' || inv.estado === 'EXPIRED');
  }
}