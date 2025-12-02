import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { NgIf, NgFor } from '@angular/common';

interface HoopsJugador {
  curp: string;
  nombres: string;
  ap_p: string;
  ap_m?: string;
  edad?: number;
}

interface JugadorEquipo {
  id_equipo: number;
  dorsal: number;
  activo: boolean;
  persona: HoopsJugador;
}

interface EquipoConJugadores {
  id_equipo?: number;
  nombre: string;
  logo_url?: string | null;
  jugadores?: JugadorEquipo[];
}

@Component({
  selector: 'app-team-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-modal.component.html',
  styleUrls: ['./team-modal.component.css'],
})
export class TeamModalComponent implements OnChanges {

  @Input() isOpen = false;
  @Input() tournamentId!: number;
  @Input() equipo: EquipoConJugadores | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() equipoUpdated = new EventEmitter<void>();

  apiUrl = 'https://hoopsbackend-production.up.railway.app';
  equipoTemp: EquipoConJugadores | null = null;

  nuevoJugador: any = {
    curp: '',
    nombres: '',
    ap_p: '',
    ap_m: '',
    edad: null,
    dorsal: 0,
  };

  jugadorEncontrado: any = null;
  buscandoCURP = false;
  errorMensaje: string = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.equipo) {
      // Hacer una copia profunda para no modificar el original
      this.equipoTemp = {
        id_equipo: this.equipo.id_equipo,
        nombre: this.equipo.nombre || '',
        jugadores: this.equipo.jugadores 
          ? JSON.parse(JSON.stringify(this.equipo.jugadores))
          : []
      };
    }
    this.resetFormularioJugador();
    this.errorMensaje = '';
  }

  get jugadoresOrdenados(): JugadorEquipo[] {
    return this.equipoTemp?.jugadores
      ? [...this.equipoTemp.jugadores].sort((a, b) => a.dorsal - b.dorsal)
      : [];
  }

  onCurpInput() {
    this.nuevoJugador.curp = this.nuevoJugador.curp.toUpperCase();
    this.errorMensaje = '';
  }

  buscarPorCURP() {
    const curp = this.nuevoJugador.curp.trim();
    
    if (curp.length !== 18) {
      this.errorMensaje = 'La CURP debe tener 18 caracteres';
      return;
    }

    this.buscandoCURP = true;
    this.errorMensaje = '';

    this.http
      .get<any>(`${this.apiUrl}/players/lookup?curp=${curp}`)
      .subscribe({
        next: (data) => {
          console.log('Respuesta del servidor:', data);
          
          // Manejar diferentes estructuras de respuesta
          let persona = data?.jugador || data?.persona || data?.data?.persona || data;

          if (data?.exists && persona?.curp) {
            this.jugadorEncontrado = persona;
            this.nuevoJugador.nombres = persona.nombres ?? '';
            this.nuevoJugador.ap_p = persona.ap_p ?? '';
            this.nuevoJugador.ap_m = persona.ap_m ?? '';
            this.nuevoJugador.edad = persona.edad ?? null;
            
            // Forzar actualización de la vista
            setTimeout(() => {
              this.buscandoCURP = false;
            }, 0);
          } else {
            this.jugadorEncontrado = null;
            this.errorMensaje = 'CURP no encontrada. Completa los datos para registrar al jugador.';
            this.buscandoCURP = false;
          }
        },
        error: (err) => {
          console.error('Error en búsqueda:', err);
          this.jugadorEncontrado = null;
          this.errorMensaje = 'Error al buscar la CURP';
          this.buscandoCURP = false;
        }
      });
  }

  agregarJugadorAlEquipo() {
    if (!this.equipoTemp) return;

    this.errorMensaje = '';

    // Validar CURP
    const curp = this.nuevoJugador.curp.trim().toUpperCase();
    if (!curp || curp.length !== 18) {
      this.errorMensaje = 'La CURP debe tener 18 caracteres';
      return;
    }

    // Validar dorsal
    if (this.nuevoJugador.dorsal < 0 || this.nuevoJugador.dorsal > 99) {
      this.errorMensaje = 'El dorsal debe estar entre 0 y 99';
      return;
    }

    // Validar datos del jugador
    if (!this.jugadorEncontrado && 
        (!this.nuevoJugador.nombres.trim() || !this.nuevoJugador.ap_p.trim())) {
      this.errorMensaje = 'Debes completar nombres y apellido paterno';
      return;
    }

    // Validar dorsal duplicado
    const dorsalDuplicado = this.equipoTemp.jugadores?.some(
      j => j.dorsal === this.nuevoJugador.dorsal
    );

    if (dorsalDuplicado) {
      this.errorMensaje = `El dorsal ${this.nuevoJugador.dorsal} ya está asignado en este equipo`;
      return;
    }

    // Validar CURP duplicada en el equipo
    const curpDuplicada = this.equipoTemp.jugadores?.some(
      j => j.persona.curp.toUpperCase() === curp
    );

    if (curpDuplicada) {
      this.errorMensaje = `Esta persona (CURP: ${curp}) ya está en el equipo`;
      return;
    }

    // Crear objeto persona
    const persona: HoopsJugador = {
      curp: curp,
      nombres: this.nuevoJugador.nombres.trim(),
      ap_p: this.nuevoJugador.ap_p.trim(),
      ap_m: this.nuevoJugador.ap_m?.trim() || '',
      edad: this.nuevoJugador.edad || undefined,
    };

    // Crear nuevo jugador
    const nuevo: JugadorEquipo = {
      id_equipo: this.equipoTemp.id_equipo ?? 0,
      dorsal: this.nuevoJugador.dorsal,
      activo: true,
      persona,
    };

    // Agregar al array
    if (!this.equipoTemp.jugadores) {
      this.equipoTemp.jugadores = [];
    }
    this.equipoTemp.jugadores.push(nuevo);

    console.log('Jugador agregado:', nuevo);
    console.log('Lista actual:', this.equipoTemp.jugadores);

    // Resetear formulario
    this.resetFormularioJugador();
  }

  resetFormularioJugador() {
    this.jugadorEncontrado = null;
    this.nuevoJugador = {
      curp: '',
      nombres: '',
      ap_p: '',
      ap_m: '',
      edad: null,
      dorsal: this.siguienteDorsal()
    };
    this.errorMensaje = '';
  }

  siguienteDorsal(): number {
    if (!this.equipoTemp?.jugadores?.length) return 0;
    const dorsales = this.equipoTemp.jugadores.map(j => j.dorsal);
    return Math.max(...dorsales) + 1;
  }

  toggleJugadorActivo(i: number) {
    if (!this.equipoTemp?.jugadores?.[i]) return;
    this.equipoTemp.jugadores[i].activo = !this.equipoTemp.jugadores[i].activo;
  }

  eliminarJugadorDelEquipo(i: number) {
    if (!this.equipoTemp?.jugadores) return;
    
    if (confirm('¿Eliminar este jugador del equipo?')) {
      this.equipoTemp.jugadores.splice(i, 1);
    }
  }

  private mostrarErrorBackend(err: any) {
    const detail = err?.error?.detail ?? err?.error;

    let msg = 'Error al guardar equipo';

    if (typeof detail === 'string') {
      msg += `:\n${detail}`;
    } else if (Array.isArray(detail)) {
      msg += ':\n' + detail
        .map((e: any) => `${(e.loc || []).join('.')} → ${e.msg}`)
        .join('\n');
    } else if (detail) {
      msg += ':\n' + JSON.stringify(detail, null, 2);
    }

    alert(msg);
  }

  guardarEquipo() {
    if (!this.equipoTemp || !this.equipoTemp.nombre.trim()) {
      alert('Debes capturar el nombre del equipo');
      return;
    }

    const isEdit = !!this.equipoTemp.id_equipo;

    console.log('Guardando equipo:', {
      isEdit,
      equipo: this.equipoTemp,
      jugadores: this.equipoTemp.jugadores
    });

    // ========= CREAR EQUIPO (POST /tournaments/{id}/teams) =========
    if (!isEdit) {
      const url = `${this.apiUrl}/tournaments/${this.tournamentId}/teams`;

      const formData = new FormData();
      formData.append('nombre', this.equipoTemp.nombre.trim());

      this.http.post<any>(url, formData).subscribe({
        next: (resp) => {
          console.log('✅ Equipo creado:', resp);

          const nuevoId = resp?.id_equipo;
          if (!nuevoId) {
            this.equipoUpdated.emit();
            this.close();
            return;
          }

          const jugadores = this.equipoTemp?.jugadores ?? [];
          if (!jugadores.length) {
            this.equipoUpdated.emit();
            this.close();
            return;
          }

          // ====== Crear jugadores en /teams/{id_equipo}/players ======
          const peticiones = jugadores.map(j => {
            const payload = {
              curp: j.persona.curp.toUpperCase(),
              dorsal: j.dorsal,
              nombres: j.persona.nombres,
              ap_p: j.persona.ap_p,
              ap_m: j.persona.ap_m || '',
              edad: j.persona.edad || null,
            };

            console.log('Enviando jugador:', payload);

            return this.http.post(
              `${this.apiUrl}/teams/${nuevoId}/players`,
              payload
            );
          });

          forkJoin(peticiones).subscribe({
            next: (resJugadores) => {
              console.log('✅ Jugadores creados:', resJugadores);
              alert('Equipo y jugadores guardados exitosamente');
              this.equipoUpdated.emit();
              this.close();
            },
            error: (err) => {
              console.error('❌ Error al crear jugadores:', err);
              this.mostrarErrorBackend(err);
              // Aún recargamos para ver el equipo
              this.equipoUpdated.emit();
              this.close();
            }
          });
        },
        error: (err) => {
          console.error('❌ Error al crear equipo:', err);
          this.mostrarErrorBackend(err);
        }
      });

      return;
    }

    // ========= EDITAR EQUIPO (PUT /tournaments/{id}/teams/{id_equipo}) =========
    const url = `${this.apiUrl}/tournaments/${this.tournamentId}/teams/${this.equipoTemp.id_equipo}`;

    const body = {
      nombre: this.equipoTemp.nombre.trim(),
      logo_url: this.equipoTemp.logo_url ?? null,
    };

    this.http.put(url, body).subscribe({
      next: (resp: any) => {
        console.log('✅ Equipo actualizado:', resp);
        alert('Equipo actualizado exitosamente');
        this.equipoUpdated.emit();
        this.close();
      },
      error: (err) => {
        console.error('❌ Error al actualizar equipo:', err);
        this.mostrarErrorBackend(err);
      }
    });
  }

  close() {
    this.equipoTemp = null;
    this.resetFormularioJugador();
    this.errorMensaje = '';
    this.closeModal.emit();
  }
}