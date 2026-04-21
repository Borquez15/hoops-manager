import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ApiConfigService } from '../../../services/api-config.service';

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

type FiltroFecha = 'HOY' | 'MANANA' | 'SEMANA' | 'TODOS';

@Component({
  selector: 'app-referee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './referee-dashboard.component.html',
  styleUrls: ['./referee-dashboard.component.css']
})
export class RefereeDashboardComponent implements OnInit {
  private apiConfig = inject(ApiConfigService);
  private apiUrl = this.apiConfig.apiBase;
  userName = '';
  torneos: Torneo[] = [];
  partidos: Partido[] = [];
  torneoSeleccionado: Torneo | null = null;
  
  loading = true;  // ✅ Empieza en true
  loadingPartidos = false;

  // Sistema de filtros
  filtroActivo: FiltroFecha = 'TODOS';

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUserNative();
    this.userName = user?.nombre || 'Árbitro';
    
    console.log('🚀 Iniciando RefereeDashboardComponent');
    console.log('👤 Usuario:', this.userName);
    
    this.loadTorneos();
  }

  loadTorneos(): void {
    console.log('📡 Llamando a loadTorneos()');
    console.log('⏳ Estado loading ANTES:', this.loading);
    
    this.loading = true;
    this.torneos = []; // Limpiar array
    
    console.log('🌐 Haciendo petición HTTP a:', `${this.apiUrl}/referee/my-tournaments`);
    
    this.http.get<Torneo[]>(
      `${this.apiUrl}/referee/my-tournaments`,
      { withCredentials: true }
    ).subscribe({
      next: (data) => {
        console.log('✅ Respuesta HTTP recibida');
        console.log('📦 Data recibida:', data);
        console.log('📊 Tipo de data:', typeof data);
        console.log('📊 Es array?', Array.isArray(data));
        console.log('📊 Longitud:', data?.length);
        
        // Asignar datos
        this.torneos = Array.isArray(data) ? data : [];
        this.loading = false;
        
        console.log('✅ Torneos asignados:', this.torneos);
        console.log('⏳ Estado loading DESPUÉS:', this.loading);
        
        // Forzar detección de cambios
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        
        console.log('🔄 Detección de cambios ejecutada');
      },
      error: (error) => {
        console.error('❌ Error HTTP:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Message:', error.message);
        console.error('❌ Error completo:', error);
        
        this.torneos = [];
        this.loading = false;
        
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        
        alert('Error al cargar torneos: ' + (error.message || 'Error desconocido'));
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
    this.filtroActivo = 'TODOS';
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
        this.partidos = Array.isArray(data) ? data : [];
        this.loadingPartidos = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error al cargar partidos:', error);
        this.partidos = [];
        this.loadingPartidos = false;
        this.cdr.detectChanges();
        alert('Error al cargar partidos: ' + (error.message || 'Error desconocido'));
      }
    });
  }

  // ========== SISTEMA DE FILTROS ==========
  cambiarFiltro(filtro: FiltroFecha): void {
    this.filtroActivo = filtro;
    console.log('🔍 Filtro cambiado a:', filtro);
  }

  get partidosPendientes(): Partido[] {
    return this.partidos.filter(p => p.estado === 'PROGRAMADO');
  }

  get partidosEnCurso(): Partido[] {
    return this.partidos.filter(p => p.estado === 'EN_CURSO');
  }

  get partidosFiltrados(): Partido[] {
    const pendientes = this.partidosPendientes;

    if (this.filtroActivo === 'TODOS') {
      return pendientes;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return pendientes.filter(partido => {
      const fechaPartido = new Date(partido.fecha);
      fechaPartido.setHours(0, 0, 0, 0);

      switch (this.filtroActivo) {
        case 'HOY':
          return fechaPartido.getTime() === hoy.getTime();

        case 'MANANA':
          const manana = new Date(hoy);
          manana.setDate(manana.getDate() + 1);
          return fechaPartido.getTime() === manana.getTime();

        case 'SEMANA':
          const finSemana = new Date(hoy);
          finSemana.setDate(finSemana.getDate() + 7);
          return fechaPartido >= hoy && fechaPartido <= finSemana;

        default:
          return true;
      }
    });
  }

  getFiltroTexto(): string {
    switch (this.filtroActivo) {
      case 'HOY': return 'para hoy';
      case 'MANANA': return 'para mañana';
      case 'SEMANA': return 'esta semana';
      default: return 'asignados';
    }
  }

  // ========== ACCIONES ==========
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
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const fechaPartido = new Date(date);
      fechaPartido.setHours(0, 0, 0, 0);

      const diff = (fechaPartido.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);

      if (diff === 0) return 'HOY';
      if (diff === 1) return 'MAÑANA';
      
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
