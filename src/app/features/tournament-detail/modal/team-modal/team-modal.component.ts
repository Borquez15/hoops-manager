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

  // Guardar jugadores originales para comparar cambios
  jugadoresOriginales: JugadorEquipo[] = [];


  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['equipo'] && this.equipo) {
      console.log('🔄 Modal recibió equipo:', this.equipo);
      
      // Hacer una copia profunda completa
      this.equipoTemp = {
        id_equipo: this.equipo.id_equipo,
        nombre: this.equipo.nombre || '',
        logo_url: this.equipo.logo_url,
        jugadores: this.equipo.jugadores 
          ? JSON.parse(JSON.stringify(this.equipo.jugadores))
          : []
      };

      // Guardar copia de jugadores originales
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
      return;
    }

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
            
            setTimeout(() => {
              this.buscandoCURP = false;
            }, 0);
          } else {
            this.jugadorEncontrado = null;
            this.errorMensaje = 'CURP no encontrada. Completa los datos para registrar al jugador.';
            this.buscandoCURP = false;
            this.cdr.detectChanges();
          }
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

    // Validar dorsal duplicado
    const dorsalDuplicado = this.equipoTemp.jugadores?.some(
      j => j.dorsal === this.nuevoJugador.dorsal
    );

    if (dorsalDuplicado) {
      this.errorMensaje = `El dorsal ${this.nuevoJugador.dorsal} ya está asignado en este equipo`;
      this.cdr.detectChanges();
      return;
    }

    // Validar CURP duplicada
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
      // ========= CREAR EQUIPO NUEVO =========
      this.crearEquipoNuevo();
    } else {
      // ========= EDITAR EQUIPO EXISTENTE =========
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
            alert('Equipo y jugadores guardados exitosamente');
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
    
    // 1. Actualizar nombre del equipo
    const urlEquipo = `${this.apiUrl}/tournaments/${this.tournamentId}/teams/${equipoId}`;
    const bodyEquipo = {
      nombre: this.equipoTemp!.nombre.trim(),
      logo_url: this.equipoTemp!.logo_url ?? null,
    };

    this.http.put(urlEquipo, bodyEquipo).subscribe({
      next: () => {
        console.log('✅ Nombre actualizado');
        
        // 2. Sincronizar jugadores
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
    console.log('📊 Jugadores actuales:', jugadoresActuales);
    console.log('📊 Jugadores originales:', jugadoresOriginales);

    // Identificar jugadores a AGREGAR (no estaban en originales)
    const jugadoresAgregar = jugadoresActuales.filter(actual => {
      const yaExistia = jugadoresOriginales.some(orig => 
        orig.persona.curp === actual.persona.curp
      );
      console.log(`  Jugador ${actual.persona.curp} - Ya existía: ${yaExistia}`);
      return !yaExistia;
    });

    // Identificar jugadores a ELIMINAR
    const jugadoresEliminar = jugadoresOriginales.filter(orig => {
      return !jugadoresActuales.some(actual =>
        actual.persona.curp === orig.persona.curp
      );
    });

    // Identificar jugadores a ACTUALIZAR
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

    console.log('➕ Jugadores a agregar:', jugadoresAgregar);
    console.log('➖ Jugadores a eliminar:', jugadoresEliminar);
    console.log('🔄 Jugadores a actualizar:', jugadoresActualizar);

    const peticiones: any[] = [];

    // AGREGAR nuevos jugadores
    jugadoresAgregar.forEach((j, index) => {
      const payload = {
        curp: j.persona.curp.toUpperCase(),
        dorsal: j.dorsal,
        nombres: j.persona.nombres,
        ap_p: j.persona.ap_p,
        ap_m: j.persona.ap_m || '',
        edad: j.persona.edad || null,
      };

      console.log(`📤 [${index + 1}] POST /teams/${equipoId}/players`, payload);

      peticiones.push(
        this.http.post(
          `${this.apiUrl}/teams/${equipoId}/players`,
          payload
        )
      );
    });

    // ELIMINAR jugadores
    jugadoresEliminar.forEach(j => {
      console.log(`🗑️  DELETE /teams/${equipoId}/players/${j.dorsal}`);
      
      peticiones.push(
        this.http.delete(
          `${this.apiUrl}/teams/${equipoId}/players/${j.dorsal}`
        )
      );
    });

    // ACTUALIZAR jugadores
    jugadoresActualizar.forEach(j => {
      const orig = jugadoresOriginales.find(o => 
        o.persona.curp === j.persona.curp
      );

      if (orig) {
        const payload = {
          dorsal: j.dorsal,
          activo: j.activo
        };

        console.log(`🔄 PUT /teams/${equipoId}/players/${orig.dorsal}`, payload);

        peticiones.push(
          this.http.put(
            `${this.apiUrl}/teams/${equipoId}/players/${orig.dorsal}`,
            payload
          )
        );
      }
    });

    console.log(`🎯 Total de peticiones a ejecutar: ${peticiones.length}`);

    if (peticiones.length === 0) {
      console.log('ℹ️ No hay cambios en jugadores');
      alert('Equipo actualizado exitosamente (sin cambios en jugadores)');
      this.equipoUpdated.emit();
      this.close();
      return;
    }

    console.log('🚀 Ejecutando peticiones...');

    forkJoin(peticiones).subscribe({
      next: (results) => {
        console.log('✅ Jugadores sincronizados:', results);
        alert(`✅ Equipo actualizado (${results.length} cambios en jugadores)`);
        this.equipoUpdated.emit();
        this.close();
      },
      error: (err) => {
        console.error('❌ Error al sincronizar jugadores:', err);
        console.error('Error completo:', JSON.stringify(err, null, 2));
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
    this.closeModal.emit();
  }
}