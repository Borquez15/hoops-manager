import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RefereeModalComponent } from '../tournament-detail/modal/referee-modal/referee-modal.component';
import { NgIf, NgFor } from '@angular/common';



// ========== INTERFACES ==========
interface Arbitro {
  id?: number;
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
  dorsal: number;
  curp: string;
  nombres: string;
  ap_p: string;
  ap_m?: string;
  edad?: number;
  activo: boolean;
}

interface Equipo {
  id?: number;
  nombre: string;
  logo_url?: string;
  jugadores: JugadorEquipo[];
}

interface Cancha {
  id_cancha?: number;
  nombre: string;
  ubicacion: string;
  activa: boolean;
}

interface TorneoConfig {
  nombre: string;
  vueltas: number;
  cupos_playoffs: number;
  modalidad: '3v3' | '5v5';
  dias_por_semana: number;
  partidos_por_dia: number;
  hora_ini: string;
  hora_fin: string;
  slot_min: number;
}

interface LookupResponse {
  exists: boolean;
  jugador?: HoopsJugador;
}

@Component({
  selector: 'app-crear-torneo',
  standalone: true,
  imports: [CommonModule, FormsModule,NgIf, NgFor, RefereeModalComponent],
  templateUrl: './create-tournament.component.html',
  styleUrls: ['./create-tournament.component.css']
})
export class CrearTorneoComponent implements OnInit {
  private apiUrl = 'https://hoopsbackend-production.up.railway.app';
  
  modalArbitrosAbierto = false;

  // ========== CONFIGURACIÓN DEL TORNEO ==========
  config: TorneoConfig = {
    nombre: '',
    vueltas: 1,
    cupos_playoffs: 2,
    modalidad: '5v5',
    dias_por_semana: 2,
    partidos_por_dia: 1,
    hora_ini: '18:00',
    hora_fin: '22:00',
    slot_min: 60
  };

  // ========== LISTAS ==========
  arbitros: Arbitro[] = [];
  equipos: Equipo[] = [];
  canchas: Cancha[] = [];

  // ========== ESTADOS DE UI ==========
  modalConfigAbierto = false;
  modalEquipoAbierto = false;
  editandoCancha = false;
  canchaEditando: Cancha | null = null;
  
  loading = false;
  error: string | null = null;
  torneoCreado = false;
  idTorneoCreado: number | null = null;

  // ========== EDICIÓN DE EQUIPO ==========
  equipoEditando: Equipo | null = null;
  indiceEquipoEditando: number = -1;
  
  // ========== FORMULARIO DE JUGADOR ==========
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

  // ========== FORMULARIO DE CANCHA ==========
  nuevaCancha: Cancha = {
    nombre: '',
    ubicacion: '',
    activa: true
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Árbitros y equipos inician vacíos - el usuario los agrega manualmente
    this.arbitros = [];
    this.equipos = [];

    this.canchas = [];
  }

  // ========== MODAL DE CONFIGURACIÓN ==========
  abrirModalConfig() {
    this.modalConfigAbierto = true;
  }

  cerrarModalConfig() {
    this.modalConfigAbierto = false;
  }

  guardarConfiguracion() {
    // Validar configuración
    if (!this.config.nombre.trim()) {
      this.error = 'El nombre del torneo es obligatorio';
      return;
    }

    if (this.config.hora_fin <= this.config.hora_ini) {
      this.error = 'La hora de fin debe ser mayor a la hora de inicio';
      return;
    }

    this.error = null;
    this.cerrarModalConfig();
  }

  // ========== CONTADORES ==========
  incrementar(campo: keyof TorneoConfig) {
    if (typeof this.config[campo] === 'number') {
      (this.config[campo] as number)++;
    }
  }

  decrementar(campo: keyof TorneoConfig) {
    const valor = this.config[campo];
    if (typeof valor === 'number') {
      // Valores mínimos
      const minimos: { [key: string]: number } = {
        vueltas: 1,
        cupos_playoffs: 0,
        dias_por_semana: 1,
        partidos_por_dia: 1,
        slot_min: 10
      };
      
      const minimo = minimos[campo] || 0;
      if (valor > minimo) {
        (this.config[campo] as number)--;
      }
    }
  }

  decrementarSlotMin() {
    if (this.config.slot_min > 10) {
      this.config.slot_min = Math.max(10, this.config.slot_min - 5);
    }
  }

  incrementarSlotMin() {
    this.config.slot_min += 5;
  }

  cambiarModalidad(modalidad: '3v3' | '5v5') {
    this.config.modalidad = modalidad;
  }

  abrirModalArbitros() {
    this.modalArbitrosAbierto = true;
  }

  cerrarModalArbitros() {
    this.modalArbitrosAbierto = false;
  }


  // ========== GESTIÓN DE CANCHAS ==========
  agregarCancha() {
    if (!this.nuevaCancha.nombre.trim()) {
      this.error = 'El nombre de la cancha es obligatorio';
      return;
    }

    this.canchas.push({
      nombre: this.nuevaCancha.nombre.trim(),
      ubicacion: this.nuevaCancha.ubicacion.trim(),
      activa: this.nuevaCancha.activa
    });

    // Resetear formulario
    this.nuevaCancha = {
      nombre: '',
      ubicacion: '',
      activa: true
    };

    this.error = null;
  }

  editarCancha(index: number) {
    this.editandoCancha = true;
    this.canchaEditando = { ...this.canchas[index] };
    this.canchas.splice(index, 1);
  }

  guardarEdicionCancha() {
    if (this.canchaEditando && this.canchaEditando.nombre.trim()) {
      this.canchas.push(this.canchaEditando);
      this.cancelarEdicionCancha();
    }
  }

  cancelarEdicionCancha() {
    this.editandoCancha = false;
    this.canchaEditando = null;
  }

  eliminarCancha(index: number) {
    if (confirm('¿Estás seguro de eliminar esta cancha?')) {
      this.canchas.splice(index, 1);
    }
  }

  toggleEstadoCancha(index: number) {
    this.canchas[index].activa = !this.canchas[index].activa;
  }

  // ========== GESTIÓN DE ÁRBITROS ==========
  agregarArbitro() {
    const nombre = prompt('Ingrese el nombre del árbitro:');
    if (nombre && nombre.trim()) {
      this.arbitros.push({ nombre: nombre.trim() });
    }
  }

  eliminarArbitro(index: number) {
    if (confirm('¿Estás seguro de eliminar este árbitro?')) {
      this.arbitros.splice(index, 1);
    }
  }

  // ========== GESTIÓN DE EQUIPOS ==========
  abrirModalEquipo() {
    this.equipoEditando = {
      nombre: '',
      logo_url: '',
      jugadores: []
    };
    this.indiceEquipoEditando = -1;
    this.modalEquipoAbierto = true;
    this.resetFormularioJugador();
  }

  editarEquipo(index: number) {
    this.equipoEditando = JSON.parse(JSON.stringify(this.equipos[index])); // Deep copy
    this.indiceEquipoEditando = index;
    this.modalEquipoAbierto = true;
    this.resetFormularioJugador();
  }

  guardarEquipo() {
    if (!this.equipoEditando || !this.equipoEditando.nombre.trim()) {
      this.error = 'El nombre del equipo es obligatorio';
      return;
    }

    if (this.indiceEquipoEditando === -1) {
      // Nuevo equipo
      this.equipos.push({ ...this.equipoEditando });
    } else {
      // Editar equipo existente
      this.equipos[this.indiceEquipoEditando] = { ...this.equipoEditando };
    }

    this.cerrarModalEquipo();
  }

  cerrarModalEquipo() {
    this.modalEquipoAbierto = false;
    this.equipoEditando = null;
    this.indiceEquipoEditando = -1;
    this.resetFormularioJugador();
    this.error = null;
  }

  eliminarEquipo(index: number) {
    if (confirm('¿Estás seguro de eliminar este equipo?')) {
      this.equipos.splice(index, 1);
    }
  }

  // ========== GESTIÓN DE JUGADORES ==========
  async buscarPorCURP() {
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
        // Prellenar el formulario
        this.nuevoJugador.nombres = response.jugador.nombres;
        this.nuevoJugador.ap_p = response.jugador.ap_p;
        this.nuevoJugador.ap_m = response.jugador.ap_m || '';
        this.nuevoJugador.edad = response.jugador.edad;
      } else {
        // CURP no existe
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

  agregarJugadorAlEquipo() {
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

  eliminarJugadorDelEquipo(index: number) {
    if (!this.equipoEditando) return;
    
    if (confirm('¿Eliminar este jugador del equipo?')) {
      this.equipoEditando.jugadores.splice(index, 1);
    }
  }

  toggleJugadorActivo(index: number) {
    if (!this.equipoEditando) return;
    this.equipoEditando.jugadores[index].activo = !this.equipoEditando.jugadores[index].activo;
  }

  resetFormularioJugador() {
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

  // ========== CREAR TORNEO ==========
  async crearTorneo() {
  if (!this.config.nombre.trim()) {
    this.error = 'El nombre del torneo es obligatorio';
    return;
  }

  this.loading = true;
  this.error = null;

  try {
    console.log('🏀 Creando torneo con configuración:', this.config);

    // 1. Crear torneo
    const torneoResponse = await this.http.post<any>(
      `${this.apiUrl}/tournaments`,
      this.config
    ).toPromise();

    this.idTorneoCreado = torneoResponse.id_torneo;
    console.log('✅ Torneo creado:', torneoResponse);

    // 2. Agregar canchas
    if (this.canchas.length > 0) {
      console.log('🏟️ Agregando canchas...');
      for (const cancha of this.canchas) {
        await this.http.post(
          `${this.apiUrl}/tournaments/${this.idTorneoCreado}/courts`,
          cancha
        ).toPromise();
      }
      console.log('✅ Canchas agregadas');
    }

    // 3. Agregar equipos
    if (this.equipos.length > 0) {
      console.log('👥 Agregando equipos...');
      
      for (const equipo of this.equipos) {
        // Preparar payload solo con campos válidos
        const equipoPayload: any = {
          nombre: equipo.nombre.trim()
        };
        
        // Solo agregar logo_url si existe
        if (equipo.logo_url && equipo.logo_url.trim()) {
          equipoPayload.logo_url = equipo.logo_url.trim();
        }
        
        console.log('📦 Creando equipo:', equipoPayload);
        
        try {
          const equipoResponse: any = await this.http.post(
            `${this.apiUrl}/tournaments/${this.idTorneoCreado}/teams`,
            equipoPayload
          ).toPromise();

          console.log('✅ Equipo creado:', equipoResponse);

          // Agregar jugadores al equipo
          if (equipo.jugadores && equipo.jugadores.length > 0) {
            console.log(`👤 Agregando ${equipo.jugadores.length} jugadores...`);
            
            for (const jugador of equipo.jugadores) {
              await this.http.post(
                `${this.apiUrl}/teams/${equipoResponse.id_equipo}/players`,
                {
                  curp: jugador.curp.trim().toUpperCase(),
                  nombres: jugador.nombres.trim(),
                  ap_p: jugador.ap_p.trim(),
                  ap_m: jugador.ap_m?.trim() || '',
                  dorsal: jugador.dorsal,
                  edad: jugador.edad,
                  activo: jugador.activo !== false
                }
              ).toPromise();
            }
            
            console.log('✅ Jugadores agregados');
          }
          
        } catch (equipoError: any) {
          console.error('❌ Error al crear equipo:', equipoError);
          console.error('📦 Payload:', equipoPayload);
          console.error('📋 Detalle:', equipoError.error);
          console.error('📋 Detalle COMPLETO:', JSON.stringify(equipoError.error, null, 2));
          throw new Error(`Error al crear equipo "${equipo.nombre}": ${equipoError.error?.detail || 'Error desconocido'}`);
        }
      }
    }

    console.log('🎉 ¡Torneo creado exitosamente!');
    this.torneoCreado = true;

    // Redirigir al panel admin
    setTimeout(() => {
      this.router.navigate(['/torneo', this.idTorneoCreado, 'admin']);
    }, 1500);

  } catch (err: any) {
    console.error('❌ Error al crear torneo:', err);
    this.error = err.message || err.error?.detail || 'Error al crear el torneo';
  } finally {
    this.loading = false;
  }
}


  // ========== UTILIDADES ==========
  volver() {
    if (confirm('¿Estás seguro? Se perderán los cambios no guardados.')) {
      this.router.navigate(['/']);
    }
  }

  get esConfigValida(): boolean {
    // Solo se requiere configuración básica para crear el torneo
    // Los equipos, jugadores, árbitros y canchas se configuran después
    return this.config.nombre.trim().length > 0 &&
           this.config.modalidad.length > 0;
  }

  // Obtener resumen de configuración
  get resumenConfig(): string {
    return `${this.config.vueltas} vuelta(s), ${this.config.modalidad}, ${this.config.dias_por_semana} días/semana`;
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
}