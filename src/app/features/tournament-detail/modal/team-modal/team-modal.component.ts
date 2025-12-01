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

  apiUrl = 'http://localhost:8000';
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

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.equipo) {
      this.equipoTemp = {
        id_equipo: this.equipo.id_equipo,
        nombre: this.equipo.nombre || '',
        jugadores: this.equipo.jugadores || []
      };
    }
  }

  get jugadoresOrdenados(): JugadorEquipo[] {
    return this.equipoTemp?.jugadores
      ? [...this.equipoTemp.jugadores].sort((a, b) => a.dorsal - b.dorsal)
      : [];
  }

  onCurpInput() {
    this.nuevoJugador.curp = this.nuevoJugador.curp.toUpperCase();
    if (this.nuevoJugador.curp.length === 18) {
      this.buscarPorCURP();
    }
  }

  buscarPorCURP() {
    if (this.nuevoJugador.curp.length !== 18) return;

    this.buscandoCURP = true;

    this.http
      .get<any>(`${this.apiUrl}/players/lookup?curp=${this.nuevoJugador.curp}`)
      .subscribe({
        next: (data) => {
          let persona = data?.persona || data?.data?.persona || data?.jugador || data;

          if (!persona?.curp) {
            this.jugadorEncontrado = null;
            this.buscandoCURP = false;
            return;
          }

          this.jugadorEncontrado = persona;

          this.nuevoJugador.nombres = persona.nombres ?? '';
          this.nuevoJugador.ap_p = persona.ap_p ?? '';
          this.nuevoJugador.ap_m = persona.ap_m ?? '';
          this.nuevoJugador.edad = persona.edad ?? null;
        },
        error: () => {
          this.jugadorEncontrado = null;
          this.buscandoCURP = false;
        },
        complete: () => {
          this.buscandoCURP = false;
        }
      });
  }

  agregarJugadorAlEquipo() {
    if (!this.equipoTemp) return;

    if (!this.nuevoJugador.curp || this.nuevoJugador.dorsal < 0) return;

    if (!this.jugadorEncontrado &&
       (!this.nuevoJugador.nombres || !this.nuevoJugador.ap_p)) return;

    const dorsalDuplicado =
      this.equipoTemp.jugadores?.some(j => j.dorsal === this.nuevoJugador.dorsal);

    if (dorsalDuplicado) return;

    const persona: HoopsJugador = {
      curp: this.nuevoJugador.curp,
      nombres: this.nuevoJugador.nombres,
      ap_p: this.nuevoJugador.ap_p,
      ap_m: this.nuevoJugador.ap_m,
      edad: this.nuevoJugador.edad,
    };

    const nuevo: JugadorEquipo = {
      id_equipo: this.equipoTemp.id_equipo ?? 0,
      dorsal: this.nuevoJugador.dorsal,
      activo: true,
      persona,
    };

    this.equipoTemp.jugadores?.push(nuevo);

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
  }

  siguienteDorsal(): number {
    if (!this.equipoTemp?.jugadores?.length) return 0;
    return Math.max(...this.equipoTemp.jugadores.map(j => j.dorsal)) + 1;
  }

  toggleJugadorActivo(i: number) {
    this.equipoTemp!.jugadores![i].activo =
      !this.equipoTemp!.jugadores![i].activo;
  }

  eliminarJugadorDelEquipo(i: number) {
    this.equipoTemp?.jugadores?.splice(i, 1);
  }

  private mostrarErrorBackend(err: any) {
  const detail = err?.error?.detail ?? err?.error;

  let msg = 'Error al guardar equipo';

  if (typeof detail === 'string') {
    msg += `:\n${detail}`;
  } else if (Array.isArray(detail)) {
    // FastAPI suele enviar una lista de errores de validación
    msg += ':\n' + detail
      .map((e: any) => `${(e.loc || []).join('.')} → ${e.msg}`)
      .join('\n');
  } else if (detail) {
    msg += ':\n' + JSON.stringify(detail, null, 2);
  }

  alert(msg);
}


  guardarEquipo() {
  if (!this.equipoTemp || !this.equipoTemp.nombre) {
    alert('Debes capturar el nombre del equipo');
    return;
  }

    const isEdit = !!this.equipoTemp.id_equipo;

  // ========= CREAR EQUIPO (POST /tournaments/{id}/teams) =========
  if (!isEdit) {
    const url = `${this.apiUrl}/tournaments/${this.tournamentId}/teams`;

    // FastAPI espera nombre y logo como FORM DATA
    const formData = new FormData();
    formData.append('nombre', this.equipoTemp.nombre.trim());

    this.http.post<any>(url, formData).subscribe({
      next: (resp) => {
        console.log('✅ Equipo creado:', resp);

        const nuevoId = resp?.id_equipo;
        if (!nuevoId) {
          // por si acaso la respuesta no trae el id
          this.equipoUpdated.emit();
          this.close();
          return;
        }

        // Si no hay jugadores en el modal, terminamos aquí
        const jugadores = this.equipoTemp?.jugadores ?? [];
        if (!jugadores.length) {
          this.equipoUpdated.emit();
          this.close();
          return;
        }

        // ====== Crear jugadores en /teams/{id_equipo}/players ======
        const peticiones = jugadores.map(j => {
          const payload = {
            curp: j.persona.curp,
            dorsal: j.dorsal,
            nombres: j.persona.nombres,
            ap_p: j.persona.ap_p,
            ap_m: j.persona.ap_m,
            edad: j.persona.edad,
          };

          return this.http.post(
            `${this.apiUrl}/teams/${nuevoId}/players`,
            payload
          );
        });

        forkJoin(peticiones).subscribe({
          next: (resJugadores) => {
            console.log('✅ Jugadores creados:', resJugadores);
            this.equipoUpdated.emit();  // el padre recarga equipos + jugadores
            this.close();
          },
          error: (err) => {
            console.error('❌ Error al crear jugadores:', err);
            this.mostrarErrorBackend(err);
            // Aun si falla alguno, recargamos para que al menos se vea el equipo
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
    // si manejas logo_url en edición, agrégalo aquí:
    logo_url: this.equipoTemp.logo_url ?? null,
  };

  this.http.put(url, body).subscribe({
    next: (resp: any) => {
      console.log('✅ Equipo actualizado:', resp);
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
    this.closeModal.emit();
  }
}
