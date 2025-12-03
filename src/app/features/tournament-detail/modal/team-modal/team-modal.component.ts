import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
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

  jugadoresOriginales: JugadorEquipo[] = [];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['equipo'] && this.equipo) {
      console.log('🔄 Modal recibió equipo:', this.equipo);
      
      this.equipoTemp = {
        id_equipo: this.equipo.id_equipo,
        nombre: this.equipo.nombre || '',
        logo_url: this.equipo.logo_url,
        jugadores: this.equipo.jugadores 
          ? JSON.parse(JSON.stringify(this.equipo.jugadores))
          : []
      };

      this.jugadoresOriginales = this.equipo.jugadores 
        ? JSON.parse(JSON.stringify(this.equipo.jugadores))
        : [];

      console.log('📋 Jugadores cargados:', this.equipoTemp.jugadores?.length || 0);
      
      this.resetFormularioJugador();
      this.errorMensaje = '';
      this.cdr.detectChanges();
    }
  }

  get jugadoresOrdenados(): JugadorEquipo[] {
    if (!this.equipoTemp?.jugadores) return [];
    return [...this.equipoTemp.jugadores].sort((a, b) => a.dorsal - b.dorsal);
  }

  onCurpInput() {
    this.nuevoJugador.curp = this.nuevoJugador.curp.toUpperCase();
    this.errorMensaje = '';
    this.cdr.detectChanges();
  }

  buscarPorCURP() {
    const curp = this.nuevoJugador.curp.trim();
    
    if (curp.length !== 18) {
      this.errorMensaje = 'La CURP debe tener 18 caracteres';
      this.cdr.detectChanges();
      return;
    }

    console.log('🔍 Buscando CURP:', curp);
    
    this.buscandoCURP = true;
    this.errorMensaje = '';
    this.cdr.detectChanges();

    this.http
      .get<any>(`${this.apiUrl}/players/lookup?curp=${curp}`)
      .subscribe({
        next: (data) => {
          console.log('📡 Respuesta del servidor:', data);
          
          let persona = data?.jugador || data?.persona || data?.data?.persona || data;

          if (data?.exists && persona?.curp) {
            this.jugadorEncontrado = persona;
            this.nuevoJugador.nombres = persona.nombres ?? '';
            this.nuevoJugador.ap_p = persona.ap_p ?? '';
            this.nuevoJugador.ap_m = persona.ap_m ?? '';
            this.nuevoJugador.edad = persona.edad ?? null;
            
            console.log('✅ Jugador encontrado:', this.jugadorEncontrado);
          } else {
            this.jugadorEncontrado = null;
            this.errorMensaje = 'CURP no encontrada. Completa los datos para registrar al jugador.';
          }
          
          this.buscandoCURP = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Error en búsqueda:', err);
          this.jugadorEncontrado = null;
          this.errorMensaje = 'Error al buscar la CURP';
          this.buscandoCURP = false;
          this.cdr.detectChanges();
        }
      });
  }

  agregarJugadorAlEquipo() {
    if (!this.equipoTemp) return;

    this.errorMensaje = '';

    const curp = this.nuevoJugador.curp.trim().toUpperCase();
    if (!curp || curp.length !== 18) {
      this.errorMensaje = 'La CURP debe tener 18 caracteres';
      this.cdr.detectChanges();
      return;
    }

    if (this.nuevoJugador.dorsal < 0 || this.nuevoJugador.dorsal > 99) {
      this.errorMensaje = 'El dorsal debe estar entre 0 y 99';
      this.cdr.detectChanges();
      return;
    }

    if (!this.jugadorEncontrado && 
        (!this.nuevoJugador.nombres.trim() || !this.nuevoJugador.ap_p.trim())) {
      this.errorMensaje = 'Debes completar nombres y apellido paterno';
      this.cdr.detectChanges();
      return;
    }

    const dorsalDuplicado = this.equipoTemp.jugadores?.some(
      j => j.dorsal === this.nuevoJugador.dorsal
    );

    if (dorsalDuplicado) {
      this.errorMensaje = `El dorsal ${this.nuevoJugador.dorsal} ya está asignado en este equipo`;
      this.cdr.detectChanges();
      return;
    }

    const curpDuplicada = this.equipoTemp.jugadores?.some(
      j => j.persona.curp.toUpperCase() === curp
    );

    if (curpDuplicada) {
      this.errorMensaje = `Esta persona (CURP: ${curp}) ya está en el equipo`;
      this.cdr.detectChanges();
      return;
    }

    const persona: HoopsJugador = {
      curp: curp,
      nombres: this.nuevoJugador.nombres.trim(),
      ap_p: this.nuevoJugador.ap_p.trim(),
      ap_m: this.nuevoJugador.ap_m?.trim() || '',
      edad: this.nuevoJugador.edad || undefined,
    };

    const nuevo: JugadorEquipo = {
      id_equipo: this.equipoTemp.id_equipo ?? 0,
      dorsal: this.nuevoJugador.dorsal,
      activo: true,
      persona,
    };

    if (!this.equipoTemp.jugadores) {
      this.equipoTemp.jugadores = [];
    }
    this.equipoTemp.jugadores.push(nuevo);

    console.log('✅ Jugador agregado:', nuevo);
    console.log('📊 Total jugadores:', this.equipoTemp.jugadores.length);

    this.resetFormularioJugador();
    this.cdr.detectChanges();
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
    this.cdr.detectChanges();
  }

  siguienteDorsal(): number {
    if (!this.equipoTemp?.jugadores?.length) return 0;
    const dorsales = this.equipoTemp.jugadores.map(j => j.dorsal);
    return Math.max(...dorsales) + 1;
  }

  toggleJugadorActivo(i: number) {
    if (!this.equipoTemp?.jugadores?.[i]) return;
    this.equipoTemp.jugadores[i].activo = !this.equipoTemp.jugadores[i].activo;
    this.cdr.detectChanges();
  }

  eliminarJugadorDelEquipo(i: number) {
    if (!this.equipoTemp?.jugadores) return;
    
    if (confirm('¿Eliminar este jugador del equipo?')) {
      this.equipoTemp.jugadores.splice(i, 1);
      console.log('🗑️ Jugador eliminado. Total:', this.equipoTemp.jugadores.length);
      this.cdr.detectChanges();
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

    console.log('💾 Guardando equipo:', {
      isEdit,
      equipo: this.equipoTemp.nombre,
      id: this.equipoTemp.id_equipo,
      jugadores: this.equipoTemp.jugadores?.length || 0
    });

    if (!isEdit) {
      this.crearEquipoNuevo();
    } else {
      this.editarEquipoExistente();
    }
  }

  private crearEquipoNuevo() {
    const url = `${this.apiUrl}/tournaments/${this.tournamentId}/teams`;
    const formData = new FormData();
    formData.append('nombre', this.equipoTemp!.nombre.trim());

    this.http.post<any>(url, formData).subscribe({
      next: (resp) => {
        console.log('✅ Equipo creado:', resp);

        const nuevoId = resp?.id_equipo;
        if (!nuevoId) {
          alert('✅ Equipo creado exitosamente');
          this.equipoUpdated.emit();
          this.close();
          return;
        }

        const jugadores = this.equipoTemp?.jugadores ?? [];
        if (!jugadores.length) {
          alert('✅ Equipo creado exitosamente');
          this.equipoUpdated.emit();
          this.close();
          return;
        }

        const peticiones = jugadores.map(j => {
          const payload = {
            curp: j.persona.curp.toUpperCase(),
            dorsal: j.dorsal,
            nombres: j.persona.nombres,
            ap_p: j.persona.ap_p,
            ap_m: j.persona.ap_m || '',
            edad: j.persona.edad || null,
          };

          return this.http.post(
            `${this.apiUrl}/teams/${nuevoId}/players`,
            payload
          );
        });

        forkJoin(peticiones).subscribe({
          next: (resJugadores) => {
            console.log('✅ Jugadores creados:', resJugadores);
            alert('✅ Equipo y jugadores guardados exitosamente');
            this.equipoUpdated.emit();
            this.close();
          },
          error: (err) => {
            console.error('❌ Error al crear jugadores:', err);
            this.mostrarErrorBackend(err);
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
  }

  private editarEquipoExistente() {
    const equipoId = this.equipoTemp!.id_equipo!;
    
    const urlEquipo = `${this.apiUrl}/tournaments/${this.tournamentId}/teams/${equipoId}`;
    const bodyEquipo = {
      nombre: this.equipoTemp!.nombre.trim(),
      logo_url: this.equipoTemp!.logo_url ?? null,
    };

    this.http.put(urlEquipo, bodyEquipo).subscribe({
      next: () => {
        console.log('✅ Nombre actualizado');
        this.sincronizarJugadores(equipoId);
      },
      error: (err) => {
        console.error('❌ Error al actualizar equipo:', err);
        this.mostrarErrorBackend(err);
      }
    });
  }

  private sincronizarJugadores(equipoId: number) {
    const jugadoresActuales = this.equipoTemp?.jugadores || [];
    const jugadoresOriginales = this.jugadoresOriginales;

    console.log('🔄 Sincronizando jugadores para equipo:', equipoId);

    const jugadoresAgregar = jugadoresActuales.filter(actual => {
      return !jugadoresOriginales.some(orig => 
        orig.persona.curp === actual.persona.curp
      );
    });

    const jugadoresEliminar = jugadoresOriginales.filter(orig => {
      return !jugadoresActuales.some(actual =>
        actual.persona.curp === orig.persona.curp
      );
    });

    const jugadoresActualizar = jugadoresActuales.filter(actual => {
      const orig = jugadoresOriginales.find(o => 
        o.persona.curp === actual.persona.curp
      );
      return orig && (orig.dorsal !== actual.dorsal || orig.activo !== actual.activo);
    });

    console.log('📊 Cambios detectados:', {
      agregar: jugadoresAgregar.length,
      eliminar: jugadoresEliminar.length,
      actualizar: jugadoresActualizar.length
    });

    const peticiones: any[] = [];

    jugadoresAgregar.forEach((j) => {
      const payload = {
        curp: j.persona.curp.toUpperCase(),
        dorsal: j.dorsal,
        nombres: j.persona.nombres,
        ap_p: j.persona.ap_p,
        ap_m: j.persona.ap_m || '',
        edad: j.persona.edad || null,
      };

      peticiones.push(
        this.http.post(
          `${this.apiUrl}/teams/${equipoId}/players`,
          payload
        )
      );
    });

    jugadoresEliminar.forEach(j => {
      peticiones.push(
        this.http.delete(
          `${this.apiUrl}/teams/${equipoId}/players/${j.dorsal}`
        )
      );
    });

    jugadoresActualizar.forEach(j => {
      const orig = jugadoresOriginales.find(o => 
        o.persona.curp === j.persona.curp
      );

      if (orig) {
        const payload = {
          dorsal: j.dorsal,
          activo: j.activo
        };

        peticiones.push(
          this.http.put(
            `${this.apiUrl}/teams/${equipoId}/players/${orig.dorsal}`,
            payload
          )
        );
      }
    });

    if (peticiones.length === 0) {
      alert('✅ Equipo actualizado (sin cambios en jugadores)');
      this.equipoUpdated.emit();
      this.close();
      return;
    }

    forkJoin(peticiones).subscribe({
      next: (results) => {
        console.log('✅ Jugadores sincronizados:', results);
        alert(`✅ Equipo actualizado (${results.length} cambios en jugadores)`);
        this.equipoUpdated.emit();
        this.close();
      },
      error: (err) => {
        console.error('❌ Error al sincronizar jugadores:', err);
        this.mostrarErrorBackend(err);
        this.equipoUpdated.emit();
        this.close();
      }
    });
  }

  close() {
    this.equipoTemp = null;
    this.jugadoresOriginales = [];
    this.resetFormularioJugador();
    this.errorMensaje = '';
    document.body.style.overflow = ''; // ✅ Desbloquear scroll
    this.closeModal.emit();
  }
}