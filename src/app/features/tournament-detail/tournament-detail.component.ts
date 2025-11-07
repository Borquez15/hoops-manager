// src/app/features/tournament-detail/tournament-detail.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TournamentService, Tournament } from '../../services/tournament.service';
import { RefereeModalComponent } from './modal/referee-modal/referee-modal.component';

// ========== INTERFACES ADICIONALES ==========
interface Arbitro {
  id_arbitro?: number;
  nombre: string;
}

interface HoopsJugador {
  id_jugador?: number;
  curp: string;
  nombres: string;
  ap_p: string;
  ap_m?: string;
  edad?: number;
}

interface JugadorEquipo {
  id_jugador?: number;
  dorsal: number;
  curp: string;
  nombres: string;
  ap_p: string;
  ap_m?: string;
  edad?: number;
  activo: boolean;
}

interface EquipoBase {
  id_equipo?: number;
  nombre: string;
  logo_url?: string;
}

interface EquipoConJugadores extends EquipoBase {
  jugadores: JugadorEquipo[];
}

interface Cancha {
  id_cancha?: number;
  nombre: string;
  ubicacion: string;
  activa: boolean;
}

interface LookupResponse {
  exists: boolean;
  jugador?: HoopsJugador;
}

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RefereeModalComponent],
  templateUrl: './tournament-detail.component.html',
  styleUrls: ['./tournament-detail.component.css']
})
export class TournamentDetailComponent implements OnInit {
  private apiUrl = 'http://localhost:8000';
  
  tournamentId!: number;
  tournament: Tournament | null = null;
  equipos: EquipoConJugadores[] = [];
  arbitros: Arbitro[] = [];
  canchas: Cancha[] = [];
  
  // Estados
  loading = false;
  error: string | null = null;
  tournamentStatus: 'configurando' | 'iniciado' | 'finalizado' = 'configurando';
  calendarGenerated = false;
  
  // Modales
  modalConfigAbierto = false;
  modalEquipoAbierto = false;
  editandoCancha = false;
  canchaEditando: Cancha | null = null;

  modalArbitroAbierto = false;
modalCalendarioAbierto = false;

// Árbitros
nuevoArbitroEmail = '';
enviandoInvitacion = false;

// Calendario
calendario: any = null;
anioCalendario = new Date().getFullYear();
mesCalendario = new Date().getMonth() + 1;
  
  // Formularios
  editForm: Partial<Tournament> = {};
  equipoEditando: EquipoConJugadores | null = null;
  indiceEquipoEditando: number = -1;
  previewLogo: string | null = null;
  
  // Formulario de jugador
  nuevoJugador: JugadorEquipo = {
    dorsal: 0,
    curp: '',
    nombres: '',
    ap_p: '',
    ap_m: '',
    edad: undefined,
    activo: true
  };
  
  jugadorEncontrado: HoopsJugador | null = null;
  buscandoCURP = false;

  // Formulario de cancha
  nuevaCancha: Cancha = {
    nombre: '',
    ubicacion: '',
    activa: true
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentService: TournamentService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🔵 Componente inicializado');
  }

  ngOnInit(): void {
    console.log('🔵 ngOnInit ejecutado');
    
    this.route.params.subscribe(params => {
      this.tournamentId = +params['id'];
      console.log('🔵 Tournament ID:', this.tournamentId);
      this.loadTournamentData();
    });
  }

  // ========================================
  // CARGA DE DATOS
  // ========================================
  
  // ========================================
// VERSIÓN MEJORADA - loadTournamentData()
// Reemplazar desde línea 148 hasta línea 199
// ========================================

async loadTournamentData(): Promise<void> {
  console.log('🟡 ========== INICIO CARGA ==========');
  
  // FORZAR estado inicial
  this.loading = true;
  this.error = null;
  this.cdr.markForCheck();
  this.cdr.detectChanges();
  
  // Timeout de seguridad
  const timeoutId = setTimeout(() => {
    if (this.loading) {
      console.error('⏰ TIMEOUT: La carga tomó más de 10 segundos');
      this.loading = false;
      this.error = 'La carga está tomando demasiado tiempo. Por favor, recarga la página.';
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }, 10000);
  
  try {
    // Cargar torneo
    const tournamentData = await this.tournamentService
      .getTournament(this.tournamentId)
      .toPromise();
    
    this.tournament = tournamentData || null;
    console.log('✅ Torneo recibido:', this.tournament);
    
    if (!this.tournament) {
      throw new Error('No se encontró el torneo');
    }
    
    // Estado
    if (this.tournament.estado) {
      this.tournamentStatus = this.tournament.estado as any;
    }
    
    // Cargar todos los datos en paralelo con manejo individual de errores
    await Promise.race([
      Promise.all([
        this.loadEquipos().catch(err => {
          console.error('❌ Error en loadEquipos:', err);
          this.equipos = [];
        }),
        this.loadArbitros().catch(err => {
          console.error('❌ Error en loadArbitros:', err);
          this.arbitros = [];
        }),
        this.loadCanchas().catch(err => {
          console.error('❌ Error en loadCanchas:', err);
          this.canchas = [];
        }),
        this.checkCalendarStatus().catch(err => {
          console.error('❌ Error en checkCalendarStatus:', err);
        })
      ]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout en carga de datos')), 8000)
      )
    ]);
    
    console.log('✅ CARGA EXITOSA');
    console.log('📊 Equipos:', this.equipos.length);
    console.log('👨‍⚖️ Árbitros:', this.arbitros.length);
    console.log('🏟️ Canchas:', this.canchas.length);
    
  } catch (error: any) {
    console.error('❌ ERROR en carga:', error);
    this.error = error?.message || 'Error al cargar el torneo';
  } finally {
    clearTimeout(timeoutId);
    
    // FORZAR actualización del estado loading
    this.loading = false;
    console.log('🔄 Setting loading = false');
    
    // Triple forzado de detección de cambios
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    // Segundo intento después de un tick
    setTimeout(() => {
      this.loading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      console.log('🔄 Second update: loading =', this.loading);
    }, 0);
    
    // Tercer intento como última verificación
    setTimeout(() => {
      if (this.loading) {
        console.warn('⚠️ WARNING: loading todavía es true después de 2 intentos!');
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
      console.log('🟢 ========== FIN CARGA ==========');
      console.log('🔍 Estado final: loading =', this.loading, 'error =', this.error);
    }, 100);
  }
}

  async loadEquipos(): Promise<void> {
    try {
      const result = await this.tournamentService
        .getEquipos(this.tournamentId)
        .toPromise();
      
      this.equipos = (result || []).map(equipo => ({
        ...equipo,
        jugadores: []
      }));

      // Cargar jugadores para cada equipo
      for (const equipo of this.equipos) {
        if (equipo.id_equipo) {
          await this.loadJugadoresEquipo(equipo.id_equipo);
        }
      }
      
    } catch (error) {
      console.error('❌ Error al cargar equipos:', error);
      this.equipos = [];
    }
  }

  async loadJugadoresEquipo(equipoId: number): Promise<void> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/teams/${equipoId}/players`
      ).toPromise();

      const equipo = this.equipos.find(e => e.id_equipo === equipoId);
      if (equipo && response) {
        equipo.jugadores = response.map(j => ({
          id_jugador: j.id_jugador,
          dorsal: j.dorsal,
          curp: j.curp,
          nombres: j.nombres,
          ap_p: j.ap_p,
          ap_m: j.ap_m,
          edad: j.edad,
          activo: j.activo !== false
        }));
      }
    } catch (error) {
      console.error(`❌ Error al cargar jugadores del equipo ${equipoId}:`, error);
    }
  }

  async loadArbitros(): Promise<void> {
  try {
    const response = await this.http.get<any[]>(
      `${this.apiUrl}/tournaments/${this.tournamentId}/referees`
    ).toPromise();

    this.arbitros = (response || []).map(a => ({
      id_arbitro: a.id_usuario,
      nombre: `${a.nombre} ${a.ap_p} ${a.ap_m || ''}`.trim()
    }));

    console.log('✅ Árbitros:', this.arbitros);
  } catch (error) {
    console.error('❌ Error al cargar árbitros:', error);
    this.arbitros = [];
  }
}

  async loadCanchas(): Promise<void> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/tournaments/${this.tournamentId}/courts`
      ).toPromise();

      this.canchas = (response || []).map(c => ({
        id_cancha: c.id_cancha,
        nombre: c.nombre,
        ubicacion: c.ubicacion || '',
        activa: c.activa !== false
      }));
    } catch (error) {
      console.error('❌ Error al cargar canchas:', error);
      this.canchas = [];
    }
  }

  async checkCalendarStatus(): Promise<void> {
    try {
      if (this.tournamentStatus !== 'configurando') {
        this.calendarGenerated = true;
      }
      // TODO: Verificar con el backend si hay partidos
    } catch (error) {
      console.error('❌ Error al verificar calendario:', error);
    }
  }

  // ========================================
  // MODAL DE CONFIGURACIÓN
  // ========================================
  
  abrirModalConfig(): void {
    if (!this.tournament) return;
    
    this.modalConfigAbierto = true;
    this.editForm = {
      nombre: this.tournament.nombre,
      vueltas: this.tournament.vueltas,
      cupos_playoffs: this.tournament.cupos_playoffs,
      modalidad: this.tournament.modalidad,
      dias_por_semana: this.tournament.dias_por_semana,
      partidos_por_dia: this.tournament.partidos_por_dia,
      hora_ini: this.tournament.hora_ini,
      hora_fin: this.tournament.hora_fin,
      slot_min: this.tournament.slot_min
    };
  }

  cerrarModalConfig(): void {
    this.modalConfigAbierto = false;
    this.editForm = {};
  }

  async guardarConfiguracion(): Promise<void> {
    if (!this.tournament) return;
    
    // Validaciones
    if (!this.editForm.nombre?.trim()) {
      this.error = 'El nombre del torneo es obligatorio';
      return;
    }

    if (this.editForm.hora_fin && this.editForm.hora_ini && 
        this.editForm.hora_fin <= this.editForm.hora_ini) {
      this.error = 'La hora de fin debe ser mayor a la hora de inicio';
      return;
    }

    try {
      // Validación de playoffs
      if (this.editForm.cupos_playoffs && this.editForm.cupos_playoffs > 0) {
        const currentTeams = this.equipos.length;
        if (currentTeams < this.editForm.cupos_playoffs) {
          const confirm = window.confirm(
            `⚠️ Estás configurando ${this.editForm.cupos_playoffs} cupos pero solo tienes ${currentTeams} equipos.\n\n` +
            `Necesitarás agregar ${this.editForm.cupos_playoffs - currentTeams} equipos más.\n\n` +
            `¿Continuar?`
          );
          if (!confirm) return;
        }
      }
      
      const updated = await this.tournamentService
        .updateTournament(this.tournamentId, this.editForm)
        .toPromise();
      
      this.tournament = updated || this.tournament;
      this.cerrarModalConfig();
      this.error = null;
      
      alert('✅ Configuración guardada');
      
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      this.error = 'Error al guardar la configuración';
    }
  }

  // Contadores para el modal de configuración
  incrementar(campo: keyof Tournament): void {
    const valor = this.editForm[campo];
    if (typeof valor === 'number') {
      (this.editForm[campo] as number)++;
    }
  }

  decrementar(campo: keyof Tournament): void {
    const valor = this.editForm[campo];
    if (typeof valor === 'number') {
      const minimos: { [key: string]: number } = {
        vueltas: 1,
        cupos_playoffs: 0,
        dias_por_semana: 1,
        partidos_por_dia: 1,
        slot_min: 10
      };
      
      const minimo = minimos[campo] || 0;
      if (valor > minimo) {
        (this.editForm[campo] as number)--;
      }
    }
  }

  decrementarSlotMin(): void {
    if (this.editForm.slot_min && this.editForm.slot_min > 10) {
      this.editForm.slot_min = Math.max(10, this.editForm.slot_min - 5);
    }
  }

  incrementarSlotMin(): void {
    if (this.editForm.slot_min) {
      this.editForm.slot_min += 5;
    }
  }

  cambiarModalidad(modalidad: string): void {
    this.editForm.modalidad = modalidad;
  }

  // ========================================
  // GESTIÓN DE CANCHAS
  // ========================================
  
  async agregarCancha(): Promise<void> {
    if (!this.nuevaCancha.nombre.trim()) {
      this.error = 'El nombre de la cancha es obligatorio';
      return;
    }

    try {
      await this.http.post(
        `${this.apiUrl}/tournaments/${this.tournamentId}/courts`,
        this.nuevaCancha
      ).toPromise();

      await this.loadCanchas();
      
      this.nuevaCancha = {
        nombre: '',
        ubicacion: '',
        activa: true
      };
      
      this.error = null;
    } catch (error) {
      console.error('❌ Error al agregar cancha:', error);
      this.error = 'Error al agregar la cancha';
    }
  }

  editarCancha(index: number): void {
    this.editandoCancha = true;
    this.canchaEditando = { ...this.canchas[index] };
  }

  async guardarEdicionCancha(): Promise<void> {
    if (!this.canchaEditando || !this.canchaEditando.nombre.trim()) {
      this.error = 'El nombre de la cancha es obligatorio';
      return;
    }

    try {
      if (this.canchaEditando.id_cancha) {
        await this.http.put(
          `${this.apiUrl}/courts/${this.canchaEditando.id_cancha}`,
          this.canchaEditando
        ).toPromise();
      }

      await this.loadCanchas();
      this.cancelarEdicionCancha();
      this.error = null;
    } catch (error) {
      console.error('❌ Error al editar cancha:', error);
      this.error = 'Error al editar la cancha';
    }
  }

  cancelarEdicionCancha(): void {
    this.editandoCancha = false;
    this.canchaEditando = null;
  }

  async eliminarCancha(index: number): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar esta cancha?')) return;

    const cancha = this.canchas[index];
    if (!cancha.id_cancha) return;

    try {
      await this.http.delete(
        `${this.apiUrl}/courts/${cancha.id_cancha}`
      ).toPromise();

      await this.loadCanchas();
    } catch (error) {
      console.error('❌ Error al eliminar cancha:', error);
      this.error = 'Error al eliminar la cancha';
    }
  }

  async toggleEstadoCancha(index: number): Promise<void> {
    const cancha = this.canchas[index];
    if (!cancha.id_cancha) return;

    try {
      cancha.activa = !cancha.activa;
      
      await this.http.put(
        `${this.apiUrl}/courts/${cancha.id_cancha}`,
        cancha
      ).toPromise();
    } catch (error) {
      console.error('❌ Error al cambiar estado:', error);
      cancha.activa = !cancha.activa; // Revertir
      this.error = 'Error al cambiar el estado de la cancha';
    }
  }

  // Helpers para el formulario de canchas
  get nombreCanchaActual(): string {
    return this.editandoCancha ? (this.canchaEditando?.nombre || '') : this.nuevaCancha.nombre;
  }

  set nombreCanchaActual(value: string) {
    if (this.editandoCancha && this.canchaEditando) {
      this.canchaEditando.nombre = value;
    } else {
      this.nuevaCancha.nombre = value;
    }
  }

  get ubicacionCanchaActual(): string {
    return this.editandoCancha ? (this.canchaEditando?.ubicacion || '') : this.nuevaCancha.ubicacion;
  }

  set ubicacionCanchaActual(value: string) {
    if (this.editandoCancha && this.canchaEditando) {
      this.canchaEditando.ubicacion = value;
    } else {
      this.nuevaCancha.ubicacion = value;
    }
  }

  // ========================================
  // GESTIÓN DE ÁRBITROS
  // ========================================
  
  agregarArbitro(): void {
    const nombre = prompt('Ingrese el nombre del árbitro:');
    if (nombre && nombre.trim()) {
      this.arbitros.push({ nombre: nombre.trim() });
      // TODO: Guardar en el backend cuando esté disponible
    }
  }

  eliminarArbitro(index: number): void {
    if (confirm('¿Estás seguro de eliminar este árbitro?')) {
      this.arbitros.splice(index, 1);
      // TODO: Eliminar del backend cuando esté disponible
    }
  }

  // ========================================
  // GESTIÓN DE EQUIPOS
  // ========================================
  
  abrirModalEquipo(): void {
    this.equipoEditando = {
      nombre: '',
      logo_url: '',
      jugadores: []
    };
    this.indiceEquipoEditando = -1;
    this.modalEquipoAbierto = true;
    this.previewLogo = null;
    this.resetFormularioJugador();
  }

  editarEquipo(index: number): void {
    this.equipoEditando = JSON.parse(JSON.stringify(this.equipos[index]));
    this.indiceEquipoEditando = index;
    this.modalEquipoAbierto = true;
    this.previewLogo = null;
    this.resetFormularioJugador();
  }

  async guardarEquipo(): Promise<void> {
    if (!this.equipoEditando || !this.equipoEditando.nombre.trim()) {
      this.error = 'El nombre del equipo es obligatorio';
      return;
    }

    try {
      if (this.indiceEquipoEditando === -1) {
        // Nuevo equipo
        const equipoResponse: any = await this.http.post(
          `${this.apiUrl}/tournaments/${this.tournamentId}/teams`,
          { 
            nombre: this.equipoEditando.nombre, 
            logo_url: this.equipoEditando.logo_url 
          }
        ).toPromise();

        // Agregar jugadores si los hay
        if (this.equipoEditando.jugadores && this.equipoEditando.jugadores.length > 0) {
          for (const jugador of this.equipoEditando.jugadores) {
            await this.http.post(
              `${this.apiUrl}/teams/${equipoResponse.id_equipo}/players`,
              {
                curp: jugador.curp,
                dorsal: jugador.dorsal,
                nombres: jugador.nombres,
                ap_p: jugador.ap_p,
                ap_m: jugador.ap_m,
                edad: jugador.edad
              }
            ).toPromise();
          }
        }
      } else {
        // Editar equipo existente
        const equipoId = this.equipos[this.indiceEquipoEditando].id_equipo;
        
        await this.http.put(
          `${this.apiUrl}/teams/${equipoId}`,
          { 
            nombre: this.equipoEditando.nombre, 
            logo_url: this.equipoEditando.logo_url 
          }
        ).toPromise();

        // Actualizar jugadores (simplificado - recargar)
        // TODO: Implementar sincronización completa de jugadores
      }

      await this.loadEquipos();
      this.cerrarModalEquipo();
      this.error = null;

      const minimumTeams = this.getMinimumTeams();
      if (this.equipos.length === minimumTeams) {
        alert(`✅ ¡Perfecto! Ya tienes los ${minimumTeams} equipos mínimos.`);
      }
      
    } catch (error: any) {
      console.error('❌ Error al guardar equipo:', error);
      this.error = error.error?.detail || 'Error al guardar el equipo';
    }
  }

  cerrarModalEquipo(): void {
    this.modalEquipoAbierto = false;
    this.equipoEditando = null;
    this.indiceEquipoEditando = -1;
    this.previewLogo = null;
    this.resetFormularioJugador();
    this.error = null;
  }

  async eliminarEquipo(index: number, equipoId?: number): Promise<void> {
    if (this.equipos.length <= this.getMinimumTeams()) {
      const confirmMsg = 
        `⚠️ Si eliminas este equipo, quedarás por debajo del mínimo requerido.\n\n¿Continuar?`;
      
      if (!confirm(confirmMsg)) return;
    } else {
      if (!confirm('¿Eliminar este equipo?')) return;
    }
    
    try {
      if (equipoId) {
        await this.tournamentService
          .deleteEquipo(this.tournamentId, equipoId)
          .toPromise();
      }
      
      await this.loadEquipos();
      
    } catch (error) {
      console.error('❌ Error al eliminar:', error);
      this.error = 'Error al eliminar el equipo';
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        this.previewLogo = e.target.result;
        if (this.equipoEditando) {
          this.equipoEditando.logo_url = e.target.result;
        }
      };
      
      reader.readAsDataURL(file);
    }
  }

  // ========================================
  // GESTIÓN DE JUGADORES
  // ========================================
  
  async buscarPorCURP(): Promise<void> {
    const curp = this.nuevoJugador.curp.trim().toUpperCase();
    
    if (curp.length !== 18) {
      this.error = 'La CURP debe tener 18 caracteres';
      return;
    }

    this.buscandoCURP = true;
    this.jugadorEncontrado = null;
    this.error = null;

    try {
      const response = await this.http.get<LookupResponse>(
        `${this.apiUrl}/players/lookup?curp=${curp}`
      ).toPromise();

      if (response?.exists && response.jugador) {
        this.jugadorEncontrado = response.jugador;
        this.nuevoJugador.nombres = response.jugador.nombres;
        this.nuevoJugador.ap_p = response.jugador.ap_p;
        this.nuevoJugador.ap_m = response.jugador.ap_m || '';
        this.nuevoJugador.edad = response.jugador.edad;
      } else {
        this.nuevoJugador.nombres = '';
        this.nuevoJugador.ap_p = '';
        this.nuevoJugador.ap_m = '';
        this.nuevoJugador.edad = undefined;
        this.error = 'CURP no encontrada. Completa los datos para registrar al jugador.';
      }
    } catch (err: any) {
      this.error = 'Error al buscar la CURP';
      console.error(err);
    } finally {
      this.buscandoCURP = false;
    }
  }

  agregarJugadorAlEquipo(): void {
    if (!this.equipoEditando) return;

    // Validaciones
    if (!this.nuevoJugador.curp.trim() || this.nuevoJugador.dorsal < 0) {
      this.error = 'CURP y dorsal son obligatorios';
      return;
    }

    if (!this.jugadorEncontrado && (!this.nuevoJugador.nombres.trim() || !this.nuevoJugador.ap_p.trim())) {
      this.error = 'Debes completar nombres y apellido paterno';
      return;
    }

    // Verificar dorsal duplicado
    const dorsalExiste = this.equipoEditando.jugadores.some(j => j.dorsal === this.nuevoJugador.dorsal);
    if (dorsalExiste) {
      this.error = `El dorsal ${this.nuevoJugador.dorsal} ya está asignado`;
      return;
    }

    // Agregar jugador
    this.equipoEditando.jugadores.push({
      dorsal: this.nuevoJugador.dorsal,
      curp: this.nuevoJugador.curp.trim().toUpperCase(),
      nombres: this.nuevoJugador.nombres.trim(),
      ap_p: this.nuevoJugador.ap_p.trim(),
      ap_m: this.nuevoJugador.ap_m?.trim() || '',
      edad: this.nuevoJugador.edad,
      activo: true
    });

    this.resetFormularioJugador();
    this.error = null;
  }

  eliminarJugadorDelEquipo(index: number): void {
    if (!this.equipoEditando) return;
    
    if (confirm('¿Eliminar este jugador del equipo?')) {
      this.equipoEditando.jugadores.splice(index, 1);
    }
  }

  toggleJugadorActivo(index: number): void {
    if (!this.equipoEditando) return;
    this.equipoEditando.jugadores[index].activo = !this.equipoEditando.jugadores[index].activo;
  }

  resetFormularioJugador(): void {
    this.nuevoJugador = {
      dorsal: this.siguienteDorsal(),
      curp: '',
      nombres: '',
      ap_p: '',
      ap_m: '',
      edad: undefined,
      activo: true
    };
    this.jugadorEncontrado = null;
  }

  siguienteDorsal(): number {
    if (!this.equipoEditando || this.equipoEditando.jugadores.length === 0) return 0;
    const dorsales = this.equipoEditando.jugadores.map(j => j.dorsal);
    return Math.max(...dorsales) + 1;
  }

  nombreCompletoJugador(jugador: JugadorEquipo): string {
    return `${jugador.nombres} ${jugador.ap_p} ${jugador.ap_m || ''}`.trim();
  }

  get jugadoresOrdenados(): JugadorEquipo[] {
    if (!this.equipoEditando) return [];
    return [...this.equipoEditando.jugadores].sort((a, b) => a.dorsal - b.dorsal);
  }

  // Helper para obtener cantidad de jugadores de forma segura
  getJugadoresCount(equipo: EquipoConJugadores): number {
    return equipo.jugadores ? equipo.jugadores.length : 0;
  }

  // ========================================
  // VALIDACIONES
  // ========================================
  
  getMinimumTeams(): number {
    if (!this.tournament) return 2;
    const minByPlayoffs = this.tournament.cupos_playoffs || 0;
    return Math.max(minByPlayoffs, 2);
  }

  getValidationMessage(): string | null {
    if (!this.tournament) return null;
    
    const minimumTeams = this.getMinimumTeams();
    const currentTeams = this.equipos.length;
    
    if (currentTeams < minimumTeams) {
      const needed = minimumTeams - currentTeams;
      return `Necesitas agregar ${needed} equipo${needed > 1 ? 's' : ''} más. Con ${this.tournament.cupos_playoffs} cupos de playoffs, requieres mínimo ${minimumTeams} equipos.`;
    }
    
    if (!this.calendarGenerated && currentTeams >= minimumTeams) {
      return 'Genera el calendario para poder iniciar el torneo.';
    }
    
    return null;
  }

  canStartTournament(): boolean {
    if (!this.tournament) return false;
    
    const hasEnoughTeams = this.equipos.length >= this.getMinimumTeams();
    const hasCalendar = this.calendarGenerated;
    const isConfiguring = this.tournamentStatus === 'configurando';
    
    return hasEnoughTeams && hasCalendar && isConfiguring;
  }

  getStatusBadge(): { text: string; class: string } {
    switch (this.tournamentStatus) {
      case 'iniciado':
        return { text: '🟢 Iniciado', class: 'badge-success' };
      case 'finalizado':
        return { text: '⚫ Finalizado', class: 'badge-finished' };
      case 'configurando':
      default:
        return { text: '🔴 Configurando', class: 'badge-warning' };
    }
  }

  // ========================================
  // CALENDARIO
  // ========================================
  
  async generateCalendar(): Promise<void> {
    const minimumTeams = this.getMinimumTeams();
    
    if (this.equipos.length < minimumTeams) {
      alert(`⚠️ Necesitas al menos ${minimumTeams} equipos`);
      return;
    }
    
    if (!confirm('¿Generar calendario automático?')) {
      return;
    }
    
    try {
      this.loading = true;
      
      await this.tournamentService
        .autoSchedule(this.tournamentId, undefined, true)
        .toPromise();
      
      this.calendarGenerated = true;
      this.loading = false;
      
      alert('✅ Calendario generado');
      
    } catch (error) {
      console.error('❌ Error al generar calendario:', error);
      this.loading = false;
      alert('❌ Error al generar calendario');
    }
  }

  editCalendar(): void {
    alert('💡 Próximamente: edición de calendario');
  }

  async startTournament(): Promise<void> {
    if (!this.canStartTournament()) {
      alert('⚠️ No se puede iniciar. Verifica los requisitos.');
      return;
    }
    
    if (!confirm('¿Iniciar el torneo?')) {
      return;
    }
    
    try {
      await this.tournamentService
        .updateTournament(this.tournamentId, { estado: 'iniciado' })
        .toPromise();
      
      alert('🚀 ¡Torneo iniciado!');
      await this.loadTournamentData();
      
    } catch (error) {
      console.error('❌ Error al iniciar:', error);
      alert('❌ Error al iniciar');
    }
  }

  abrirModalArbitro(): void {
  this.modalArbitroAbierto = true;
  this.nuevoArbitroEmail = '';
  this.error = null;
}

cerrarModalArbitro(): void {
  this.modalArbitroAbierto = false;
  this.nuevoArbitroEmail = '';
  this.error = null;
}

async enviarInvitacion(): Promise<void> {
  const email = this.nuevoArbitroEmail.trim().toLowerCase();

  if (!email) {
    this.error = 'Ingresa un email válido';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    this.error = 'Formato de email inválido';
    return;
  }

  this.enviandoInvitacion = true;
  this.error = null;

  try {
    await this.http.post(
      `${this.apiUrl}/tournaments/${this.tournamentId}/referee-invites`,
      { email, dias_validez: 7 }
    ).toPromise();

    alert(`✅ Invitación enviada a ${email}`);
    this.cerrarModalArbitro();
    await this.loadArbitros();

  } catch (err: any) {
    console.error('❌ Error:', err);
    this.error = err.error?.detail || 'Error al enviar invitación';
  } finally {
    this.enviandoInvitacion = false;
  }
}

// ========== CALENDARIO ==========

abrirModalCalendario(): void {
  this.modalCalendarioAbierto = true;
  this.loadCalendario();
}

cerrarModalCalendario(): void {
  this.modalCalendarioAbierto = false;
}

async loadCalendario(): Promise<void> {
  try {
    if (!this.calendarGenerated) return;

    const response = await this.http.get<any>(
      `${this.apiUrl}/tournaments/${this.tournamentId}/calendar/month/${this.anioCalendario}/${this.mesCalendario}`
    ).toPromise();

    this.calendario = response;
  } catch (error) {
    console.error('❌ Error al cargar calendario:', error);
    this.calendario = null;
  }
}

async mesAnterior(): Promise<void> {
  if (this.mesCalendario === 1) {
    this.anioCalendario--;
    this.mesCalendario = 12;
  } else {
    this.mesCalendario--;
  }
  await this.loadCalendario();
}

async mesSiguiente(): Promise<void> {
  if (this.mesCalendario === 12) {
    this.anioCalendario++;
    this.mesCalendario = 1;
  } else {
    this.mesCalendario++;
  }
  await this.loadCalendario();
}

getMatchColor(estado: string): string {
  switch (estado.toUpperCase()) {
    case 'PROGRAMADO': return '#3498db';
    case 'JUGADO':
    case 'FINALIZADO': return '#2ecc71';
    case 'SUSPENDIDO': return '#f39c12';
    case 'CANCELADO': return '#e74c3c';
    default: return '#95a5a6';
  }
}

  // ========================================
  // NAVEGACIÓN
  // ========================================
  
  goBack(): void {
    this.router.navigate(['/mis-torneos']);
  }
}
