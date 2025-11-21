import { Component, OnInit } from '@angular/core';
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
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADO';
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
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUserNative();
    this.userName = user?.nombre || 'Árbitro';
    this.loadTorneos();
  }

  async loadTorneos(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/referee/my-tournaments`,
        { withCredentials: true }
      ).toPromise();
      
      this.torneos = response || [];
      console.log('✅ Torneos cargados:', this.torneos.length);
    } catch (error) {
      console.error('❌ Error al cargar torneos:', error);
      this.torneos = [];
    } finally {
      this.loading = false;
    }
  }

  selectTorneo(torneo: Torneo): void {
    this.torneoSeleccionado = torneo;
    this.loadPartidos(torneo.id_torneo);
  }

  deselectTorneo(): void {
    this.torneoSeleccionado = null;
    this.partidos = [];
  }

  async loadPartidos(idTorneo: number): Promise<void> {
    this.loadingPartidos = true;
    try {
      const response = await this.http.get<Partido[]>(
        `${this.apiUrl}/referee/tournaments/${idTorneo}/my-matches`,
        { withCredentials: true }
      ).toPromise();
      
      this.partidos = response || [];
      console.log('✅ Partidos cargados:', this.partidos.length);
    } catch (error) {
      console.error('❌ Error al cargar partidos:', error);
      this.partidos = [];
    } finally {
      this.loadingPartidos = false;
    }
  }

  get partidosPendientes(): Partido[] {
    return this.partidos.filter(p => p.estado === 'PENDIENTE');
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
    this.router.navigate(['/']);
  }
}