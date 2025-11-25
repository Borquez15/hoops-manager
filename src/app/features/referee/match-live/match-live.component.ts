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
  en_timeout: boolean;  // ✅ NUEVO
  en_medio_tiempo: boolean;  // ✅ NUEVO
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
  accionPuntos: 'SUMAR' | 'RESTAR' = 'SUMAR';

  modalFaltasAbierto = false;
  equipoFaltas: 'LOCAL' | 'VISITANTE' = 'LOCAL';
  jugadorFaltas?: Jugador;

  modalEditarTiempoAbierto = false;
  minutosEditar = 10;
  segundosEditar = 0;

  tiempoTranscurrido = 600; // 10:00 minutos
  timerActivo = false;

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
            timeouts: 3
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
            timeouts: 3
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
    
    // ✅ NO INICIAR TIMER AUTOMÁTICAMENTE
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
        console.log('✅ Quintetos guardados');
      },
      error: (error) => {
        console.error('❌ Error al guardar quintetos:', error);
        alert('Error al guardar los quintetos');
      }
    });
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

  // ========== CAMBIOS ==========
  
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
    if (!this.jugadorSaliente || !this.jugadorEntrante || !this.partido) {
      alert('⚠️ Debes seleccionar ambos jugadores');
      return;
    }

    const equipo = this.equipoCambio === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    this.http.post(
      `${this.apiUrl}/matches/${this.partidoId}/cambio`,
      {
        equipo: this.equipoCambio,
        jugador_sale: this.jugadorSaliente.id_jugador,
        jugador_entra: this.jugadorEntrante.id_jugador,
        periodo: this.partido.periodo_actual,
        tiempo: this.formatearTiempo(this.tiempoTranscurrido)
      },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        if (!this.jugadorSaliente || !this.jugadorEntrante) return;

        this.jugadorSaliente.enCancha = false;
        this.jugadorEntrante.enCancha = true;

        equipo.quinteto = equipo.jugadores.filter(j => j.enCancha);
        equipo.banco = equipo.jugadores.filter(j => !j.enCancha);

        console.log('✅ Cambio realizado');
        this.cerrarModalCambio();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error al realizar cambio:', error);
        alert('Error al realizar el cambio');
      }
    });
  }

  // ========== PUNTOS ==========
  
  abrirModalPuntosSumar(equipo: 'LOCAL' | 'VISITANTE'): void {
    this.equipoPuntos = equipo;
    this.accionPuntos = 'SUMAR';
    this.jugadorPuntos = undefined;
    this.modalPuntosAbierto = true;
  }

  abrirModalPuntosRestar(equipo: 'LOCAL' | 'VISITANTE'): void {
    this.equipoPuntos = equipo;
    this.accionPuntos = 'RESTAR';
    this.jugadorPuntos = undefined;
    this.modalPuntosAbierto = true;
  }

  cerrarModalPuntos(): void {
    this.modalPuntosAbierto = false;
    this.jugadorPuntos = undefined;
  }

  seleccionarJugadorParaPuntos(jugador: Jugador): void {
    this.jugadorPuntos = jugador;
  }

  registrarPuntos(valor: 1 | 2 | 3): void {
    if (!this.jugadorPuntos || !this.partido) {
      alert('⚠️ Debes seleccionar un jugador');
      return;
    }

    const equipo = this.equipoPuntos === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;
    
    if (this.accionPuntos === 'SUMAR') {
      equipo.puntos += valor;
      this.jugadorPuntos.puntos += valor;
      console.log(`✅ +${valor} punto(s) para ${this.jugadorPuntos.nombres}`);
    } else {
      if (equipo.puntos >= valor && this.jugadorPuntos.puntos >= valor) {
        equipo.puntos -= valor;
        this.jugadorPuntos.puntos -= valor;
        console.log(`✅ -${valor} punto(s) para ${this.jugadorPuntos.nombres}`);
      } else {
        alert('⚠️ No se pueden restar más puntos');
        return;
      }
    }

    this.http.post(
      `${this.apiUrl}/matches/${this.partidoId}/punto`,
      {
        equipo: this.equipoPuntos,
        id_jugador: this.jugadorPuntos.id_jugador,
        valor: this.accionPuntos === 'SUMAR' ? valor : -valor,
        periodo: this.partido.periodo_actual,
        tiempo: this.formatearTiempo(this.tiempoTranscurrido)
      },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.cerrarModalPuntos();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error al registrar punto:', error);
      }
    });
  }

  // ========== FALTAS ==========
  
  abrirModalFaltas(equipo: 'LOCAL' | 'VISITANTE', jugador: Jugador): void {
    if (jugador.faltas >= 5) {
      alert('⚠️ Este jugador ya tiene 5 faltas y está expulsado');
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
    equipo.faltas++;

    this.http.post(
      `${this.apiUrl}/matches/${this.partidoId}/falta`,
      {
        equipo: this.equipoFaltas,
        id_jugador: this.jugadorFaltas.id_jugador,
        periodo: this.partido.periodo_actual,
        tiempo: this.formatearTiempo(this.tiempoTranscurrido)
      },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        if (this.jugadorFaltas && this.jugadorFaltas.faltas >= 5) {
          alert(`⚠️ ${this.jugadorFaltas.nombres} ${this.jugadorFaltas.ap_p} ha sido EXPULSADO por 5 faltas personales`);
          
          // ✅ Sacar al jugador expulsado de la cancha
          this.jugadorFaltas.enCancha = false;
          equipo.quinteto = equipo.jugadores.filter(j => j.enCancha);
          equipo.banco = equipo.jugadores.filter(j => !j.enCancha);
        }
        
        console.log(`✅ Falta ${this.jugadorFaltas?.faltas}/5 registrada`);
        
        // ✅ CERRAR MODAL AUTOMÁTICAMENTE
        this.cerrarModalFaltas();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error al registrar falta:', error);
      }
    });
  }

  // ========== TIMEOUTS ==========
  
  usarTimeout(equipo: 'LOCAL' | 'VISITANTE'): void {
    if (!this.partido) return;

    const team = equipo === 'LOCAL' ? this.partido.equipo_local : this.partido.equipo_visitante;

    if (team.timeouts > 0) {
      team.timeouts--;
      this.pauseTimer();
      
      // ✅ Activar marcador de timeout por 60 segundos
      this.partido.en_timeout = true;
      const tiempoAnterior = this.tiempoTranscurrido;
      this.tiempoTranscurrido = 60; // 1 minuto de timeout
      
      alert(`⏸️ Timeout de ${team.nombre}. Tiempo pausado por 1 minuto.`);
      
      // ✅ Iniciar countdown de timeout
      this.startTimer();
      
      // ✅ Después de 60 segundos, restaurar el tiempo
      setTimeout(() => {
        this.pauseTimer();
        this.partido!.en_timeout = false;
        this.tiempoTranscurrido = tiempoAnterior;
        alert('⏱️ Timeout finalizado. Partido listo para continuar.');
        this.cdr.detectChanges();
      }, 60000);
      
      this.cdr.detectChanges();
    } else {
      alert('⚠️ No hay timeouts disponibles');
    }
  }

  // ========== TIMER ==========
  
  startTimer(): void {
    if (this.timerActivo) return;

    this.timerActivo = true;
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.tiempoTranscurrido > 0) {
        this.tiempoTranscurrido--;
        this.cdr.detectChanges();
      } else {
        this.pauseTimer();
        
        // ✅ No hacer nada automático si es timeout
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

    // ✅ Medio tiempo después del período 2
    if (this.partido.periodo_actual === 2) {
      this.partido.en_medio_tiempo = true;
      this.tiempoTranscurrido = 600; // 10 minutos de medio tiempo
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
        this.tiempoTranscurrido = 300; // 5 minutos
        
        this.partido.equipo_local.timeouts = 3;
        this.partido.equipo_visitante.timeouts = 3;
        
        this.cdr.detectChanges();
        return;
      } else {
        this.mostrarGanador();
        return;
      }
    } else {
      if (this.partido.equipo_local.puntos === this.partido.equipo_visitante.puntos) {
        alert(`🏀 ¡Sigue el EMPATE! Overtime ${this.partido.periodo_actual - 3}`);
        this.partido.periodo_actual++;
        this.tiempoTranscurrido = 300;
        
        this.partido.equipo_local.timeouts = 3;
        this.partido.equipo_visitante.timeouts = 3;
        
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
    
    // ✅ Salir de medio tiempo
    if (this.partido.en_medio_tiempo) {
      this.partido.en_medio_tiempo = false;
      this.partido.periodo_actual = 3;
      this.tiempoTranscurrido = 600;
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
      } else {
        this.tiempoTranscurrido = 300;
        this.partido.en_overtime = true;
      }

      this.partido.equipo_local.timeouts = 3;
      this.partido.equipo_visitante.timeouts = 3;

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
}