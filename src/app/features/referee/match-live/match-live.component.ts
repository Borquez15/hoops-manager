import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

interface Jugador {
  id_jugador: number;
  nombres: string;
  ap_p: string;
  ap_m?: string;
  dorsal: number;
  enCancha: boolean;
}

interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
  jugadores: Jugador[];
  quinteto: Jugador[];
  banco: Jugador[];
  puntos: number;
  faltas: number;
}

interface Partido {
  id_partido: number;
  fecha: string;
  hora: string;
  cancha: string;
  estado: string;
  periodo_actual: number;
  tiempo_restante: string;
  equipo_local: Equipo;
  equipo_visitante: Equipo;
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
  private timerSubscription?: Subscription;

  partido?: Partido;
  loading = true;
  error = '';

  seleccionandoQuinteto = true;
  equipoSeleccionando: 'LOCAL' | 'VISITANTE' = 'LOCAL';
  quintetoTemporal: Jugador[] = [];

  modalCambioAbierto = false;
  equipoCambio: 'LOCAL' | 'VISITANTE' = 'LOCAL';
  jugadorSaliente?: Jugador;
  jugadorEntrante?: Jugador;

  modalPuntosAbierto = false;
  equipoPuntos: 'LOCAL' | 'VISITANTE' = 'LOCAL';
  jugadorPuntos?: Jugador;

  modalFaltasAbierto = false;
  equipoFaltas: 'LOCAL' | 'VISITANTE' = 'LOCAL';
  jugadorFaltas?: Jugador;

  tiempoTranscurrido = 0;
  timerActivo = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.partidoId = +this.route.snapshot.params['id'];
    this.loadPartido();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  async loadPartido(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.http.get<any>(
        `${this.apiUrl}/matches/${this.partidoId}/live`,
        { withCredentials: true }
      ).toPromise();

      if (!response) throw new Error('No se pudo cargar el partido');

      this.partido = {
        id_partido: response.id_partido,
        fecha: response.fecha,
        hora: response.hora,
        cancha: response.cancha,
        estado: response.estado,
        periodo_actual: response.periodo_actual || 1,
        tiempo_restante: response.tiempo_restante || '10:00',
        equipo_local: {
          id_equipo: response.equipo_local.id_equipo,
          nombre: response.equipo_local.nombre,
          logo_url: response.equipo_local.logo_url,
          jugadores: response.equipo_local.jugadores.map((j: any) => ({
            ...j,
            enCancha: false
          })),
          quinteto: [],
          banco: [],
          puntos: response.equipo_local.puntos || 0,
          faltas: response.equipo_local.faltas || 0
        },
        equipo_visitante: {
          id_equipo: response.equipo_visitante.id_equipo,
          nombre: response.equipo_visitante.nombre,
          logo_url: response.equipo_visitante.logo_url,
          jugadores: response.equipo_visitante.jugadores.map((j: any) => ({
            ...j,
            enCancha: false
          })),
          quinteto: [],
          banco: [],
          puntos: response.equipo_visitante.puntos || 0,
          faltas: response.equipo_visitante.faltas || 0
        }
      };

      if (response.quinteto_local && response.quinteto_local.length === 5) {
        this.seleccionandoQuinteto = false;
        this.cargarQuintetos(response);
      }

      console.log('✅ Partido cargado:', this.partido);
    } catch (error) {
      console.error('❌ Error al cargar partido:', error);
      this.error = 'Error al cargar el partido';
    } finally {
      this.loading = false;
    }
  }

  toggleJugadorQuinteto(jugador: Jugador): void {
    const index = this.quintetoTemporal.findIndex(j => j.id_jugador === jugador.id_jugador);
    
    if (index > -1) {
      this.quintetoTemporal.splice(index, 1);
    } else {
      if (this.quintetoTemporal.length < 5) {
        this.quintetoTemporal.push(jugador);
      } else {
        alert('⚠️ Solo puedes seleccionar 5 jugadores');
      }
    }
  }

  isJugadorSeleccionado(jugador: Jugador): boolean {
    return this.quintetoTemporal.some(j => j.id_jugador === jugador.id_jugador);
  }

  confirmarQuintetoLocal(): void {
    if (this.quintetoTemporal.length !== 5) {
      alert('⚠️ Debes seleccionar exactamente 5 jugadores');
      return;
    }

    if (!this.partido) return;

    this.partido.equipo_local.quinteto = [...this.quintetoTemporal];
    this.partido.equipo_local.jugadores.forEach(j => {
      j.enCancha = this.quintetoTemporal.some(qt => qt.id_jugador === j.id_jugador);
    });
    this.partido.equipo_local.banco = this.partido.equipo_local.jugadores.filter(j => !j.enCancha);

    this.equipoSeleccionando = 'VISITANTE';
    this.quintetoTemporal = [];
  }

  confirmarQuintetoVisitante(): void {
    if (this.quintetoTemporal.length !== 5) {
      alert('⚠️ Debes seleccionar exactamente 5 jugadores');
      return;
    }

    if (!this.partido) return;

    this.partido.equipo_visitante.quinteto = [...this.quintetoTemporal];
    this.partido.equipo_visitante.jugadores.forEach(j => {
      j.enCancha = this.quintetoTemporal.some(qt => qt.id_jugador === j.id_jugador);
    });
    this.partido.equipo_visitante.banco = this.partido.equipo_visitante.jugadores.filter(j => !j.enCancha);

    this.guardarQuintetos();
    this.seleccionandoQuinteto = false;
    this.quintetoTemporal = [];
  }

  async guardarQuintetos(): Promise<void> {
    if (!this.partido) return;

    try {
      await this.http.post(
        `${this.apiUrl}/matches/${this.partidoId}/quintetos`,
        {
          quinteto_local: this.partido.equipo_local.quinteto.map(j => j.id_jugador),
          quinteto_visitante: this.partido.equipo_visitante.quinteto.map(j => j.id_jugador)
        },
        { withCredentials: true }
      ).toPromise();

      console.log('✅ Quintetos guardados');
    } catch (error) {
      console.error('❌ Error al guardar quintetos:', error);
    }
  }

  cargarQuintetos(response: any): void {
    if (!this.partido) return;

    this.partido.equipo_local.quinteto = this.partido.equipo_local.jugadores.filter(j =>
      response.quinteto_local.includes(j.id_jugador)
    );
    this.partido.equipo_local.quinteto.forEach(j => j.enCancha = true);
    this.partido.equipo_local.banco = this.partido.equipo_local.jugadores.filter(j => !j.enCancha);

    this.partido.equipo_visitante.quinteto = this.partido.equipo_visitante.jugadores.filter(j =>
      response.quinteto_visitante.includes(j.id_jugador)
    );
    this.partido.equipo_visitante.quinteto.forEach(j => j.enCancha = true);
    this.partido.equipo_visitante.banco = this.partido.equipo_visitante.jugadores.filter(j => !j.enCancha);
  }

  abrirModalCambio(equipo: 'LOCAL' | 'VISITANTE'): void {
    this.equipoCambio = equipo;
    this.jugadorSaliente = undefined;
    this.jugadorEntrante = undefined;
    this.modalCambioAbierto = true;
  }

  cerrarModalCambio(): void {
    this.modalCambioAbierto = false;
    this.jugadorSaliente = undefined;
    this.jugadorEntrante = undefined;
  }

  seleccionarJugadorSaliente(jugador: Jugador): void {
    this.jugadorSaliente = jugador;
  }

  seleccionarJugadorEntrante(jugador: Jugador): void {
    this.jugadorEntrante = jugador;
  }

  async confirmarCambio(): Promise<void> {
    if (!this.jugadorSaliente || !this.jugadorEntrante || !this.partido) {
      alert('⚠️ Debes seleccionar ambos jugadores');
      return;
    }

    const equipo = this.equipoCambio === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    try {
      await this.http.post(
        `${this.apiUrl}/matches/${this.partidoId}/cambio`,
        {
          equipo: this.equipoCambio,
          jugador_sale: this.jugadorSaliente.id_jugador,
          jugador_entra: this.jugadorEntrante.id_jugador,
          periodo: this.partido.periodo_actual,
          tiempo: this.formatearTiempo(this.tiempoTranscurrido)
        },
        { withCredentials: true }
      ).toPromise();

      this.jugadorSaliente.enCancha = false;
      this.jugadorEntrante.enCancha = true;

      equipo.quinteto = equipo.jugadores.filter(j => j.enCancha);
      equipo.banco = equipo.jugadores.filter(j => !j.enCancha);

      console.log('✅ Cambio realizado');
      this.cerrarModalCambio();
    } catch (error) {
      console.error('❌ Error al realizar cambio:', error);
      alert('Error al realizar el cambio');
    }
  }

  abrirModalPuntos(equipo: 'LOCAL' | 'VISITANTE', jugador: Jugador): void {
    this.equipoPuntos = equipo;
    this.jugadorPuntos = jugador;
    this.modalPuntosAbierto = true;
  }

  cerrarModalPuntos(): void {
    this.modalPuntosAbierto = false;
    this.jugadorPuntos = undefined;
  }

  async registrarPuntos(valor: 1 | 2 | 3): Promise<void> {
    if (!this.jugadorPuntos || !this.partido) return;

    const equipo = this.equipoPuntos === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    try {
      await this.http.post(
        `${this.apiUrl}/matches/${this.partidoId}/punto`,
        {
          equipo: this.equipoPuntos,
          id_jugador: this.jugadorPuntos.id_jugador,
          valor: valor,
          periodo: this.partido.periodo_actual,
          tiempo: this.formatearTiempo(this.tiempoTranscurrido)
        },
        { withCredentials: true }
      ).toPromise();

      equipo.puntos += valor;

      console.log(`✅ ${valor} punto(s) para ${this.jugadorPuntos.nombres}`);
      this.cerrarModalPuntos();
    } catch (error) {
      console.error('❌ Error al registrar punto:', error);
      alert('Error al registrar punto');
    }
  }

  abrirModalFaltas(equipo: 'LOCAL' | 'VISITANTE', jugador: Jugador): void {
    this.equipoFaltas = equipo;
    this.jugadorFaltas = jugador;
    this.modalFaltasAbierto = true;
  }

  cerrarModalFaltas(): void {
    this.modalFaltasAbierto = false;
    this.jugadorFaltas = undefined;
  }

  async registrarFalta(): Promise<void> {
    if (!this.jugadorFaltas || !this.partido) return;

    const equipo = this.equipoFaltas === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    try {
      await this.http.post(
        `${this.apiUrl}/matches/${this.partidoId}/falta`,
        {
          equipo: this.equipoFaltas,
          id_jugador: this.jugadorFaltas.id_jugador,
          periodo: this.partido.periodo_actual,
          tiempo: this.formatearTiempo(this.tiempoTranscurrido)
        },
        { withCredentials: true }
      ).toPromise();

      equipo.faltas++;

      console.log(`✅ Falta registrada para ${this.jugadorFaltas.nombres}`);
      this.cerrarModalFaltas();
    } catch (error) {
      console.error('❌ Error al registrar falta:', error);
      alert('Error al registrar falta');
    }
  }

  startTimer(): void {
    if (this.timerActivo) return;

    this.timerActivo = true;
    this.timerSubscription = interval(1000).subscribe(() => {
      this.tiempoTranscurrido++;
    });
  }

  pauseTimer(): void {
    this.timerActivo = false;
    this.timerSubscription?.unsubscribe();
  }

  stopTimer(): void {
    this.pauseTimer();
    this.tiempoTranscurrido = 0;
  }

  formatearTiempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  }

  get equipoSeleccionandoData(): Equipo | undefined {
    if (!this.partido) return undefined;
    return this.equipoSeleccionando === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;
  }

  getNombreCompleto(jugador: Jugador): string {
    return `${jugador.nombres} ${jugador.ap_p} ${jugador.ap_m || ''}`.trim();
  }

  goBack(): void {
    if (confirm('¿Salir del partido? Los cambios no guardados se perderán.')) {
      this.router.navigate(['/arbitro']);
    }
  }

  async finalizarPartido(): Promise<void> {
    if (!confirm('¿Finalizar el partido?')) return;

    try {
      await this.http.post(
        `${this.apiUrl}/matches/${this.partidoId}/finalizar`,
        {},
        { withCredentials: true }
      ).toPromise();

      alert('✅ Partido finalizado');
      this.router.navigate(['/arbitro']);
    } catch (error) {
      console.error('❌ Error al finalizar partido:', error);
      alert('Error al finalizar partido');
    }
  }
}