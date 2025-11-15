import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

interface Jugador {
  id_jugador: number;
  nombre_completo: string;
  dorsal: number;
}

interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
  jugadores: Jugador[];
  puntos: number;
  faltas: number;
}

interface Partido {
  id_partido: number;
  fecha: string;
  hora: string;
  estado: string;
  periodo_actual: number;
  tiempo_transcurrido: number;
  local: Equipo;
  visitante: Equipo;
}

interface Accion {
  id_accion: number;
  tipo: string;
  puntos: number;
  id_jugador: number;
  id_equipo: number;
  periodo: number;
  minuto: number;
  segundo: number;
  timestamp: string;
}

@Component({
  selector: 'app-match-live',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-live.component.html',
  styleUrls: ['./match-live.component.css']
})
export class MatchLiveComponent implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:8000';
  private partidoId!: number;
  private updateSubscription?: Subscription;

  partido?: Partido;
  acciones: Accion[] = [];
  loading = true;
  
  // Timer
  timerRunning = false;
  tiempoActual = 0;
  private timerSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.partidoId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadMatchData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.updateSubscription?.unsubscribe();
  }

  async loadMatchData(): Promise<void> {
    try {
      const [partidoData, accionesData] = await Promise.all([
        this.http.get<Partido>(`${this.apiUrl}/matches/${this.partidoId}`).toPromise(),
        this.http.get<Accion[]>(`${this.apiUrl}/matches/${this.partidoId}/actions`).toPromise()
      ]);

      this.partido = partidoData!;
      this.acciones = accionesData || [];
      this.tiempoActual = this.partido?.tiempo_transcurrido || 0;
      
      if (this.partido?.estado === 'EN_CURSO') {
        this.startTimer();
      }
      
      this.loading = false;
    } catch (error) {
      console.error('Error loading match:', error);
      this.loading = false;
    }
  }

  startAutoRefresh(): void {
    this.updateSubscription = interval(5000).subscribe(() => {
      this.loadMatchData();
    });
  }

  // Timer
  startTimer(): void {
    if (!this.timerRunning) {
      this.timerRunning = true;
      this.timerSubscription = interval(1000).subscribe(() => {
        this.tiempoActual++;
      });
    }
  }

  stopTimer(): void {
    this.timerRunning = false;
    this.timerSubscription?.unsubscribe();
  }

  resetTimer(): void {
    this.stopTimer();
    this.tiempoActual = 0;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async iniciarPartido(): Promise<void> {
    try {
      await this.http.patch(`${this.apiUrl}/matches/${this.partidoId}/start`, {}).toPromise();
      this.startTimer();
      await this.loadMatchData();
    } catch (error) {
      console.error('Error starting match:', error);
    }
  }

  async finalizarPartido(): Promise<void> {
    if (confirm('¿Finalizar partido?')) {
      try {
        await this.http.patch(`${this.apiUrl}/matches/${this.partidoId}/finish`, {}).toPromise();
        this.stopTimer();
        await this.loadMatchData();
      } catch (error) {
        console.error('Error finishing match:', error);
      }
    }
  }

  async registrarPuntos(equipoId: number, jugadorId: number, puntos: number): Promise<void> {
    try {
      await this.http.post(`${this.apiUrl}/matches/${this.partidoId}/actions`, {
        tipo: puntos === 1 ? 'TIRO_LIBRE' : puntos === 2 ? 'CANASTA_2' : 'CANASTA_3',
        puntos,
        id_jugador: jugadorId,
        id_equipo: equipoId,
        periodo: this.partido?.periodo_actual || 1,
        minuto: Math.floor(this.tiempoActual / 60),
        segundo: this.tiempoActual % 60
      }).toPromise();
      
      await this.loadMatchData();
    } catch (error) {
      console.error('Error registering points:', error);
    }
  }

  async registrarFalta(equipoId: number, jugadorId: number): Promise<void> {
    try {
      await this.http.post(`${this.apiUrl}/matches/${this.partidoId}/actions`, {
        tipo: 'FALTA',
        puntos: 0,
        id_jugador: jugadorId,
        id_equipo: equipoId,
        periodo: this.partido?.periodo_actual || 1,
        minuto: Math.floor(this.tiempoActual / 60),
        segundo: this.tiempoActual % 60
      }).toPromise();
      
      await this.loadMatchData();
    } catch (error) {
      console.error('Error registering foul:', error);
    }
  }

  getJugadorNombre(jugadorId: number, equipoId: number): string {
    const equipo = equipoId === this.partido?.local.id_equipo ? this.partido.local : this.partido?.visitante;
    const jugador = equipo?.jugadores.find(j => j.id_jugador === jugadorId);
    return jugador?.nombre_completo || 'Jugador';
  }

  getAccionIcon(tipo: string): string {
    switch (tipo) {
      case 'CANASTA_3': return '🎯';
      case 'CANASTA_2': return '🏀';
      case 'TIRO_LIBRE': return '🎯';
      case 'FALTA': return '⚠️';
      default: return '⚡';
    }
  }

  volver(): void {
    this.router.navigate(['/torneos']);
  }
}