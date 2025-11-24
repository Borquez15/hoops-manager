import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';

interface Torneo {
  id_torneo: number;
  nombre: string;
  logo_url?: string;
}

interface Partido {
  id_partido: number;
  fecha: string;
  hora: string;
  cancha: string;
  equipo_local: string;
  equipo_visitante: string;
  logo_local?: string;
  logo_visitante?: string;
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO';
  id_torneo: number;
}

@Component({
  selector: 'app-referee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './referee-dashboard.component.html',
  styleUrls: ['./referee-dashboard.component.css']
})
export class RefereeDashboardComponent implements OnInit {
  private apiUrl = 'http://localhost:8000';
  
  userName = '';
  torneos: Torneo[] = [];
  partidos: Partido[] = [];
  torneoSeleccionado: Torneo | null = null;
  
  loading = false;
  loadingPartidos = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef  // ✅ AGREGADO
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUserNative();
    this.userName = user?.nombre || 'Árbitro';
    this.loadTorneos();
  }

  loadTorneos(): void {
    console.log('🔄 Cargando torneos del árbitro...');
    this.loading = true;
    console.log('📊 Estado loading:', this.loading);
    
    this.http.get<Torneo[]>(
      `${this.apiUrl}/referee/my-tournaments`,
      { withCredentials: true }
    ).subscribe({
      next: (data) => {
        console.log('✅ Respuesta recibida:', data);
        this.torneos = data || [];
        console.log('✅ Torneos asignados al array:', this.torneos.length);
        console.log('✅ Contenido del array:', this.torneos);
        
        this.loading = false;
        console.log('📊 Estado loading después de cargar:', this.loading);
        
        // ✅ FORZAR DETECCIÓN DE CAMBIOS
        this.cdr.detectChanges();
        console.log('🔄 Detección de cambios forzada');
      },
      error: (error) => {
        console.error('❌ Error al cargar torneos:', error);
        this.torneos = [];
        this.loading = false;
        this.cdr.detectChanges();  // ✅ AGREGADO
      }
    });
  }

  selectTorneo(torneo: Torneo): void {
    console.log('🏀 Seleccionando torneo:', torneo);
    this.torneoSeleccionado = torneo;
    this.loadPartidos(torneo.id_torneo);
  }

  deselectTorneo(): void {
    this.torneoSeleccionado = null;
    this.partidos = [];
  }

  loadPartidos(idTorneo: number): void {
    console.log('🔄 Cargando partidos del torneo:', idTorneo);
    this.loadingPartidos = true;
    
    this.http.get<Partido[]>(
      `${this.apiUrl}/referee/tournaments/${idTorneo}/my-matches`,
      { withCredentials: true }
    ).subscribe({
      next: (data) => {
        console.log('✅ Partidos recibidos:', data);
        this.partidos = data || [];
        this.loadingPartidos = false;
        this.cdr.detectChanges();  // ✅ AGREGADO
      },
      error: (error) => {
        console.error('❌ Error al cargar partidos:', error);
        this.partidos = [];
        this.loadingPartidos = false;
        this.cdr.detectChanges();  // ✅ AGREGADO
      }
    });
  }

  get partidosPendientes(): Partido[] {
    return this.partidos.filter(p => p.estado === 'PROGRAMADO');
  }

  get partidosEnCurso(): Partido[] {
    return this.partidos.filter(p => p.estado === 'EN_CURSO');
  }

  startMatch(partido: Partido): void {
    if (confirm(`¿Iniciar el partido ${partido.equipo_local} vs ${partido.equipo_visitante}?`)) {
      this.router.navigate(['/arbitro/partido', partido.id_partido]);
    }
  }

  continueMatch(partido: Partido): void {
    this.router.navigate(['/arbitro/partido', partido.id_partido]);
  }

  formatDate(fecha: string): string {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return fecha;
    }
  }

  goHome(): void {
    if (this.torneoSeleccionado) {
      this.deselectTorneo();
    } else {
      this.router.navigate(['/']);
    }
  }
}