import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  puntos: number;
  faltas: number;
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
  timeouts: number;
  faltasPorCuarto: number[];
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
  en_overtime: boolean;
  en_timeout: boolean;
  en_medio_tiempo: boolean;
}

@Component({
  selector: 'app-match-live',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  puntosPorAgregar = 0;

  modalEditarPuntosAbierto = false;
  equipoEditarPuntos: 'LOCAL' | 'VISITANTE' = 'LOCAL';
  jugadorEditarPuntos?: Jugador;
  puntosPorRestar = 0;

  modalFaltasAbierto = false;
  equipoFaltas: 'LOCAL' | 'VISITANTE' = 'LOCAL';
  jugadorFaltas?: Jugador;

  modalSustitucionForzadaAbierto = false;
  equipoSustitucionForzada: 'LOCAL' | 'VISITANTE' = 'LOCAL';
  jugadorExpulsado?: Jugador;
  jugadorSustituto?: Jugador;
  jugadoresSustitutos: Jugador[] = [];

  modalEditarTiempoAbierto = false;
  minutosEditar = 10;
  segundosEditar = 0;

  tiempoTranscurrido = 600;
  timerActivo = false;
  partidoIniciado = false;  // ✅ NUEVO

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.partidoId = +this.route.snapshot.params['id'];
    console.log('🏀 Iniciando carga del partido:', this.partidoId);
    this.loadPartido();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  loadPartido(): void {
    this.loading = true;
    this.error = '';
    
    console.log('📡 Haciendo petición a:', `${this.apiUrl}/matches/${this.partidoId}/live`);
    
    this.http.get<any>(
      `${this.apiUrl}/matches/${this.partidoId}/live`,
      { withCredentials: true }
    ).subscribe({
      next: (response) => {
        console.log('✅ Respuesta recibida del backend:', response);

        if (!response) {
          throw new Error('No se pudo cargar el partido');
        }

        this.partido = {
          id_partido: response.id_partido,
          fecha: response.fecha,
          hora: response.hora,
          cancha: response.cancha,
          estado: response.estado,
          periodo_actual: response.periodo_actual || 1,
          tiempo_restante: response.tiempo_restante || '10:00',
          en_overtime: false,
          en_timeout: false,
          en_medio_tiempo: false,
          equipo_local: {
            id_equipo: response.equipo_local.id_equipo,
            nombre: response.equipo_local.nombre,
            logo_url: response.equipo_local.logo_url,
            jugadores: response.equipo_local.jugadores.map((j: any) => ({
              ...j,
              enCancha: false,
              puntos: 0,
              faltas: 0
            })),
            quinteto: [],
            banco: [],
            puntos: response.equipo_local.puntos || 0,
            faltas: response.equipo_local.faltas || 0,
            timeouts: 2,
            faltasPorCuarto: [0, 0, 0, 0]
          },
          equipo_visitante: {
            id_equipo: response.equipo_visitante.id_equipo,
            nombre: response.equipo_visitante.nombre,
            logo_url: response.equipo_visitante.logo_url,
            jugadores: response.equipo_visitante.jugadores.map((j: any) => ({
              ...j,
              enCancha: false,
              puntos: 0,
              faltas: 0
            })),
            quinteto: [],
            banco: [],
            puntos: response.equipo_visitante.puntos || 0,
            faltas: response.equipo_visitante.faltas || 0,
            timeouts: 2,
            faltasPorCuarto: [0, 0, 0, 0]
          }
        };

        if (response.quinteto_local && response.quinteto_local.length === 5) {
          this.seleccionandoQuinteto = false;
          this.cargarQuintetos(response);
        }

        console.log('✅ Partido procesado:', this.partido);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error al cargar partido:', error);
        this.error = 'Error al cargar el partido: ' + (error.message || 'Error desconocido');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarQuintetos(response: any): void {
    if (!this.partido) return;

    if (response.quinteto_local) {
      this.partido.equipo_local.quinteto = response.quinteto_local.map((id: number) => {
        const jugador = this.partido!.equipo_local.jugadores.find(j => j.id_jugador === id);
        if (jugador) {
          jugador.enCancha = true;
        }
        return jugador!;
      }).filter((j: Jugador | undefined) => j !== undefined);
    }

    if (response.quinteto_visitante) {
      this.partido.equipo_visitante.quinteto = response.quinteto_visitante.map((id: number) => {
        const jugador = this.partido!.equipo_visitante.jugadores.find(j => j.id_jugador === id);
        if (jugador) {
          jugador.enCancha = true;
        }
        return jugador!;
      }).filter((j: Jugador | undefined) => j !== undefined);
    }

    this.partido.equipo_local.banco = this.partido.equipo_local.jugadores.filter(j => !j.enCancha);
    this.partido.equipo_visitante.banco = this.partido.equipo_visitante.jugadores.filter(j => !j.enCancha);
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
    this.cdr.detectChanges();
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
    
    console.log('✅ Quintetos confirmados. Presiona PLAY para iniciar el partido.');
    
    this.cdr.detectChanges();
  }

  guardarQuintetos(): void {
    if (!this.partido) return;

    console.log('💾 Guardando quintetos...');

    this.http.post(
      `${this.apiUrl}/matches/${this.partidoId}/quintetos`,
      {
        quinteto_local: this.partido.equipo_local.quinteto.map(j => j.id_jugador),
        quinteto_visitante: this.partido.equipo_visitante.quinteto.map(j => j.id_jugador)
      },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        console.log('✅ Quintetos guardados exitosamente');
      },
      error: (error) => {
        console.error('❌ Error al guardar quintetos:', error);
        alert('Error al guardar quintetos');
      }
    });
  }

  abrirModalPuntos(equipo: 'LOCAL' | 'VISITANTE'): void {
    this.equipoPuntos = equipo;
    this.jugadorPuntos = undefined;
    this.puntosPorAgregar = 0;
    this.modalPuntosAbierto = true;
  }

  cerrarModalPuntos(): void {
    this.modalPuntosAbierto = false;
    this.jugadorPuntos = undefined;
    this.puntosPorAgregar = 0;
  }

  seleccionarJugadorPuntos(jugador: Jugador): void {
    this.jugadorPuntos = jugador;
  }

  seleccionarPuntos(puntos: number): void {
    this.puntosPorAgregar = puntos;
  }

  confirmarAgregarPuntos(): void {
    if (!this.jugadorPuntos || this.puntosPorAgregar === 0) {
      alert('⚠️ Selecciona un jugador y la cantidad de puntos');
      return;
    }

    if (!this.partido) return;

    this.jugadorPuntos.puntos += this.puntosPorAgregar;

    const equipo = this.equipoPuntos === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;
    equipo.puntos += this.puntosPorAgregar;

    console.log(`✅ ${this.puntosPorAgregar} puntos agregados a ${this.jugadorPuntos.ap_p} ${this.jugadorPuntos.ap_m}`);

    this.guardarEstadisticaRapida('puntos', this.equipoPuntos, this.jugadorPuntos, this.puntosPorAgregar);

    this.cerrarModalPuntos();
    this.cdr.detectChanges();
  }

  abrirModalEditarPuntos(equipo: 'LOCAL' | 'VISITANTE'): void {
    this.equipoEditarPuntos = equipo;
    this.jugadorEditarPuntos = undefined;
    this.puntosPorRestar = 0;
    this.modalEditarPuntosAbierto = true;
  }

  cerrarModalEditarPuntos(): void {
    this.modalEditarPuntosAbierto = false;
    this.jugadorEditarPuntos = undefined;
    this.puntosPorRestar = 0;
  }

  seleccionarJugadorEditarPuntos(jugador: Jugador): void {
    this.jugadorEditarPuntos = jugador;
  }

  seleccionarPuntosRestar(puntos: number): void {
    this.puntosPorRestar = puntos;
  }

  confirmarEditarPuntos(): void {
    if (!this.jugadorEditarPuntos || this.puntosPorRestar === 0) {
      alert('⚠️ Selecciona un jugador y la cantidad de puntos a restar');
      return;
    }

    if (!this.partido) return;

    const equipo = this.equipoEditarPuntos === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    if (this.jugadorEditarPuntos.puntos < this.puntosPorRestar) {
      alert('⚠️ El jugador no tiene suficientes puntos para restar');
      return;
    }

    if (equipo.puntos < this.puntosPorRestar) {
      alert('⚠️ El equipo no tiene suficientes puntos para restar');
      return;
    }

    this.jugadorEditarPuntos.puntos -= this.puntosPorRestar;
    equipo.puntos -= this.puntosPorRestar;

    console.log(`✅ ${this.puntosPorRestar} puntos restados de ${this.jugadorEditarPuntos.ap_p} ${this.jugadorEditarPuntos.ap_m}`);

    this.guardarEstadisticaRapida('puntos', this.equipoEditarPuntos, this.jugadorEditarPuntos, -this.puntosPorRestar);

    this.cerrarModalEditarPuntos();
    this.cdr.detectChanges();
  }

  abrirModalFaltas(equipo: 'LOCAL' | 'VISITANTE', jugador: Jugador): void {
    if (jugador.faltas >= 5) {
      alert('⚠️ Este jugador ya está expulsado (5 faltas)');
      return;
    }

    this.equipoFaltas = equipo;
    this.jugadorFaltas = jugador;
    this.modalFaltasAbierto = true;
  }

  cerrarModalFaltas(): void {
    this.modalFaltasAbierto = false;
    this.jugadorFaltas = undefined;
  }

  registrarFalta(): void {
    if (!this.jugadorFaltas || !this.partido) return;

    const equipo = this.equipoFaltas === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    this.jugadorFaltas.faltas++;

    const indiceCuarto = Math.min(this.partido.periodo_actual - 1, 3);
    if (indiceCuarto >= 0 && indiceCuarto < 4) {
      equipo.faltasPorCuarto[indiceCuarto]++;
    }

    equipo.faltas++;

    console.log(`⚠️ Falta registrada: ${this.jugadorFaltas.ap_p} ${this.jugadorFaltas.ap_m} (${this.jugadorFaltas.faltas}/5)`);

    this.guardarEstadisticaRapida('faltas', this.equipoFaltas, this.jugadorFaltas, 1);

    if (this.jugadorFaltas.faltas >= 5) {
      this.cerrarModalFaltas();
      alert(`🔴 ${this.jugadorFaltas.ap_p} ${this.jugadorFaltas.ap_m} ha sido EXPULSADO por 5 faltas`);
      
      this.abrirModalSustitucionForzada(this.equipoFaltas, this.jugadorFaltas);
    } else {
      this.cerrarModalFaltas();
    }

    this.cdr.detectChanges();
  }

  abrirModalSustitucionForzada(equipo: 'LOCAL' | 'VISITANTE', jugadorExp: Jugador): void {
    this.equipoSustitucionForzada = equipo;
    this.jugadorExpulsado = jugadorExp;
    this.jugadorSustituto = undefined;

    const equipoData = equipo === 'LOCAL' ? this.partido?.equipo_local : this.partido?.equipo_visitante;
    
    this.jugadoresSustitutos = equipoData?.banco.filter(j => j.faltas < 5) || [];

    if (this.jugadoresSustitutos.length === 0) {
      alert('⚠️ No hay jugadores disponibles en el banco. El equipo debe continuar con un jugador menos.');
      return;
    }

    this.modalSustitucionForzadaAbierto = true;
  }

  seleccionarJugadorSustituto(jugador: Jugador): void {
    this.jugadorSustituto = jugador;
  }

  confirmarSustitucionForzada(): void {
    if (!this.jugadorSustituto || !this.jugadorExpulsado || !this.partido) return;

    const equipo = this.equipoSustitucionForzada === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    const indexExpulsado = equipo.quinteto.findIndex(j => j.id_jugador === this.jugadorExpulsado!.id_jugador);
    if (indexExpulsado > -1) {
      equipo.quinteto.splice(indexExpulsado, 1);
    }

    this.jugadorSustituto.enCancha = true;
    equipo.quinteto.push(this.jugadorSustituto);

    const indexSustituto = equipo.banco.findIndex(j => j.id_jugador === this.jugadorSustituto!.id_jugador);
    if (indexSustituto > -1) {
      equipo.banco.splice(indexSustituto, 1);
    }

    this.jugadorExpulsado.enCancha = false;
    equipo.banco.push(this.jugadorExpulsado);

    console.log(`🔄 Sustitución forzada: ${this.jugadorExpulsado.ap_p} OUT → ${this.jugadorSustituto.ap_p} IN`);

    this.modalSustitucionForzadaAbierto = false;
    this.jugadorExpulsado = undefined;
    this.jugadorSustituto = undefined;
    this.cdr.detectChanges();
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

  confirmarCambio(): void {
    if (!this.jugadorSaliente || !this.jugadorEntrante || !this.partido) return;

    const equipo = this.equipoCambio === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    const indexSaliente = equipo.quinteto.findIndex(j => j.id_jugador === this.jugadorSaliente!.id_jugador);
    if (indexSaliente > -1) {
      equipo.quinteto[indexSaliente] = this.jugadorEntrante;
    }

    this.jugadorSaliente.enCancha = false;
    this.jugadorEntrante.enCancha = true;

    const indexEntrante = equipo.banco.findIndex(j => j.id_jugador === this.jugadorEntrante!.id_jugador);
    if (indexEntrante > -1) {
      equipo.banco[indexEntrante] = this.jugadorSaliente;
    }

    console.log(`🔄 Cambio realizado: ${this.jugadorSaliente.ap_p} OUT → ${this.jugadorEntrante.ap_p} IN`);

    this.cerrarModalCambio();
    this.cdr.detectChanges();
  }

  usarTimeout(equipo: 'LOCAL' | 'VISITANTE'): void {
    if (!this.partido) return;

    const equipoData = equipo === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;
    const timeoutsDisponibles = this.getTimeoutsDisponibles(equipo);

    if (timeoutsDisponibles <= 0) {
      alert('⚠️ No quedan tiempos muertos disponibles');
      return;
    }

    if (this.partido.periodo_actual === 4 && this.tiempoTranscurrido <= 120) {
      const timeoutsUsadosEnUltimos2Min = this.getTimeoutsUsadosEnUltimos2Minutos(equipo);
      if (timeoutsUsadosEnUltimos2Min >= 1) {
        alert('⚠️ Solo se permite 1 timeout en los últimos 2 minutos del 4to cuarto');
        return;
      }
    }

    if (confirm(`¿Usar tiempo muerto para ${equipoData.nombre}?`)) {
      equipoData.timeouts--;
      this.partido.en_timeout = true;
      this.pauseTimer();
      
      console.log(`⏸️ Timeout usado por ${equipoData.nombre}. Quedan: ${equipoData.timeouts}`);
      
      setTimeout(() => {
        if (this.partido) {
          this.partido.en_timeout = false;
          console.log('▶️ Timeout finalizado');
          this.cdr.detectChanges();
        }
      }, 60000);

      this.cdr.detectChanges();
    }
  }

  getTimeoutsDisponibles(equipo: 'LOCAL' | 'VISITANTE'): number {
    if (!this.partido) return 0;

    const equipoData = equipo === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;
    const periodo = this.partido.periodo_actual;

    if (this.partido.en_overtime) {
      return equipoData.timeouts;
    } else if (periodo <= 2) {
      return Math.min(equipoData.timeouts, 2);
    } else if (periodo <= 4) {
      return Math.min(equipoData.timeouts, 3);
    }

    return equipoData.timeouts;
  }

  getTimeoutsUsadosEnUltimos2Minutos(equipo: 'LOCAL' | 'VISITANTE'): number {
    return 0;
  }

  get faltasCuartoLocal(): number {
    if (!this.partido) return 0;
    const indiceCuarto = Math.min(this.partido.periodo_actual - 1, 3);
    return this.partido.equipo_local.faltasPorCuarto[indiceCuarto] || 0;
  }

  get faltasCuartoVisitante(): number {
    if (!this.partido) return 0;
    const indiceCuarto = Math.min(this.partido.periodo_actual - 1, 3);
    return this.partido.equipo_visitante.faltasPorCuarto[indiceCuarto] || 0;
  }

  // ============================================
  // ✅ NUEVO: INICIAR PARTIDO
  // ============================================
  
  iniciarPartido(): void {
    if (this.partidoIniciado) return;

    console.log('▶️ Iniciando partido en el backend...');
    
    this.http.post(
      `${this.apiUrl}/matches/${this.partidoId}/iniciar`,
      {},
      { withCredentials: true }
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Partido iniciado en el backend:', response);
        this.partidoIniciado = true;
        
        if (this.partido) {
          this.partido.estado = 'EN_VIVO';
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error al iniciar partido:', error);
        alert('Error al iniciar el partido');
      }
    });
  }

  // ============================================
  // TIMER
  // ============================================

  toggleTimer(): void {
    if (this.timerActivo) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer(): void {
    if (this.timerSubscription && !this.timerSubscription.closed) {
      return;
    }

    // ✅ MODIFICADO: Iniciar partido en el backend la primera vez
    if (!this.partidoIniciado) {
      this.iniciarPartido();
    }

    this.timerActivo = true;
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.tiempoTranscurrido > 0) {
        this.tiempoTranscurrido--;
        this.cdr.detectChanges();
      } else {
        this.pauseTimer();
        
        if (this.partido && !this.partido.en_timeout && !this.partido.en_medio_tiempo) {
          this.verificarFinPeriodo();
        }
      }
    });
    
    console.log('▶️ Timer iniciado');
  }

  pauseTimer(): void {
    this.timerActivo = false;
    this.timerSubscription?.unsubscribe();
    console.log('⏸️ Timer pausado');
  }

  stopTimer(): void {
    this.pauseTimer();
    this.tiempoTranscurrido = 600;
    console.log('⏹️ Timer detenido y reseteado');
  }

  resetTimer(): void {
    if (confirm('¿Reiniciar el cronómetro a 10:00?')) {
      this.pauseTimer();
      this.tiempoTranscurrido = 600;
      this.cdr.detectChanges();
      console.log('🔄 Timer reseteado a 10:00');
    }
  }

  agregarTiempo(): void {
    this.tiempoTranscurrido += 60;
    console.log('⏱️ +1 minuto agregado');
    this.cdr.detectChanges();
  }

  restarTiempo(): void {
    if (this.tiempoTranscurrido >= 60) {
      this.tiempoTranscurrido -= 60;
      console.log('⏱️ -1 minuto restado');
    } else {
      this.tiempoTranscurrido = 0;
    }
    this.cdr.detectChanges();
  }

  abrirModalEditarTiempo(): void {
    const minutos = Math.floor(this.tiempoTranscurrido / 60);
    const segundos = this.tiempoTranscurrido % 60;
    this.minutosEditar = minutos;
    this.segundosEditar = segundos;
    this.modalEditarTiempoAbierto = true;
  }

  cerrarModalEditarTiempo(): void {
    this.modalEditarTiempoAbierto = false;
  }

  confirmarEditarTiempo(): void {
    if (this.minutosEditar < 0 || this.segundosEditar < 0 || this.segundosEditar >= 60) {
      alert('⚠️ Tiempo inválido');
      return;
    }

    this.tiempoTranscurrido = (this.minutosEditar * 60) + this.segundosEditar;
    this.cerrarModalEditarTiempo();
    this.cdr.detectChanges();
    console.log(`⏱️ Tiempo editado a ${this.formatearTiempo(this.tiempoTranscurrido)}`);
  }

  verificarFinPeriodo(): void {
    if (!this.partido) return;

    const indiceCuarto = Math.min(this.partido.periodo_actual - 1, 3);
    if (indiceCuarto >= 0 && indiceCuarto < 4) {
    }

    if (this.partido.periodo_actual === 2) {
      this.partido.en_medio_tiempo = true;
      this.tiempoTranscurrido = 600;
      alert('⏸️ MEDIO TIEMPO - 10 minutos de descanso');
      this.cdr.detectChanges();
      return;
    }

    if (this.partido.periodo_actual < 4) {
      alert(`⏱️ Fin del Período ${this.partido.periodo_actual}`);
    } else if (this.partido.periodo_actual === 4) {
      if (this.partido.equipo_local.puntos === this.partido.equipo_visitante.puntos) {
        alert('🏀 ¡EMPATE! El partido irá a TIEMPO EXTRA (Overtime)');
        this.partido.en_overtime = true;
        this.partido.periodo_actual = 5;
        this.tiempoTranscurrido = 300;
        
        this.partido.equipo_local.timeouts = 2;
        this.partido.equipo_visitante.timeouts = 2;
        
        this.cdr.detectChanges();
        return;
      } else {
        this.mostrarGanador();
        return;
      }
    } else {
      if (this.partido.equipo_local.puntos === this.partido.equipo_visitante.puntos) {
        alert(`🏀 ¡Sigue el EMPATE! Overtime ${this.partido.periodo_actual - 4}`);
        this.partido.periodo_actual++;
        this.tiempoTranscurrido = 300;
        
        this.partido.equipo_local.timeouts = 2;
        this.partido.equipo_visitante.timeouts = 2;
        
        this.cdr.detectChanges();
        return;
      } else {
        this.mostrarGanador();
        return;
      }
    }
  }

  siguientePeriodo(): void {
    if (!this.partido) return;
    
    if (this.partido.en_medio_tiempo) {
      this.partido.en_medio_tiempo = false;
      this.partido.periodo_actual = 3;
      this.tiempoTranscurrido = 600;
      
      this.partido.equipo_local.timeouts = 3;
      this.partido.equipo_visitante.timeouts = 3;
      
      this.pauseTimer();
      console.log('✅ Medio tiempo finalizado - Período 3');
      this.cdr.detectChanges();
      return;
    }

    if (this.partido.periodo_actual >= 4 && !this.partido.en_overtime) {
      alert('⚠️ No puedes avanzar manualmente después del 4to período. Espera a que termine el tiempo.');
      return;
    }

    if (confirm(`¿Pasar al Período ${this.partido.periodo_actual + 1}?`)) {
      this.partido.periodo_actual++;
      
      if (this.partido.periodo_actual <= 4) {
        this.tiempoTranscurrido = 600;
        
        if (this.partido.periodo_actual <= 2) {
          this.partido.equipo_local.timeouts = 2;
          this.partido.equipo_visitante.timeouts = 2;
        } else {
          this.partido.equipo_local.timeouts = 3;
          this.partido.equipo_visitante.timeouts = 3;
        }
      } else {
        this.tiempoTranscurrido = 300;
        this.partido.en_overtime = true;
        
        this.partido.equipo_local.timeouts = 2;
        this.partido.equipo_visitante.timeouts = 2;
      }

      this.pauseTimer();
      console.log(`✅ Período cambiado a: ${this.partido.periodo_actual}`);
      this.cdr.detectChanges();
    }
  }

  mostrarGanador(): void {
    if (!this.partido) return;

    const ganador = this.partido.equipo_local.puntos > this.partido.equipo_visitante.puntos
      ? this.partido.equipo_local.nombre
      : this.partido.equipo_visitante.nombre;

    const marcadorFinal = `${this.partido.equipo_local.puntos} - ${this.partido.equipo_visitante.puntos}`;

    alert(`🏆 ¡PARTIDO FINALIZADO!

Ganador: ${ganador}
Marcador Final: ${marcadorFinal}

${this.partido.en_overtime ? '(Ganado en Tiempo Extra)' : ''}`);

    this.pauseTimer();
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

  getNombrePeriodo(): string {
    if (!this.partido) return 'Período 1';
    
    if (this.partido.en_medio_tiempo) {
      return 'MEDIO TIEMPO';
    }
    
    if (this.partido.en_timeout) {
      return 'TIMEOUT';
    }
    
    if (this.partido.periodo_actual <= 4) {
      return `Período ${this.partido.periodo_actual}`;
    } else {
      return `Overtime ${this.partido.periodo_actual - 4}`;
    }
  }

  goBack(): void {
    if (confirm('¿Salir del partido? Los cambios no guardados se perderán.')) {
      this.router.navigate(['/arbitro']);
    }
  }

  finalizarPartido(): void {
    if (!confirm('¿Finalizar el partido?')) return;

    this.http.post(
      `${this.apiUrl}/matches/${this.partidoId}/finalizar`,
      {},
      { withCredentials: true }
    ).subscribe({
      next: () => {
        alert('✅ Partido finalizado');
        this.router.navigate(['/arbitro']);
      },
      error: (error) => {
        console.error('❌ Error al finalizar partido:', error);
        alert('Error al finalizar partido');
      }
    });
  }

  private guardarEstadisticaRapida(
    tipo: string,
    equipo: 'LOCAL' | 'VISITANTE',
    jugador: Jugador,
    valor: number
  ): void {
    if (!this.partido) return;

    const endpoint =
      tipo === 'puntos' ? 'punto' :
      tipo === 'faltas' ? 'falta' :
      tipo;

    this.http.post(
      `${this.apiUrl}/matches/${this.partidoId}/${endpoint}`,
      {
        equipo: equipo,
        id_jugador: jugador.id_jugador,
        valor: valor,
        periodo: this.partido!.periodo_actual,
        tiempo: this.formatearTiempo(this.tiempoTranscurrido)
      },
      { withCredentials: true }
    ).subscribe({
      next: () => console.log(`✅ ${tipo} guardado`),
      error: (error) => console.error(`❌ Error al guardar ${tipo}:`, error)
    });
  }
}