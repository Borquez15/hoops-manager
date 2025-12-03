// src/app/models/tournament.model.ts

export type Modalidad = '3v3' | '5v5';

// 🔥 ACTUALIZAR ESTA LÍNEA - Agregar 'PLAYOFFS'
export type EstadoTorneo = 'DRAFT' | 'ACTIVO' | 'PLAYOFFS' | 'FINALIZADO';

// 🔥 AGREGAR ESTA LÍNEA NUEVA
export type FormatoPlayoff = 'directo' | 'mejor_de_3' | 'mejor_de_5' | 'mejor_de_7';

export interface Tournament {
  id_torneo?: number;
  nombre: string;
  vueltas: number;
  cupos_playoffs: number;
  
  // 🔥 ACTUALIZAR ESTA LÍNEA - Usar el tipo FormatoPlayoff
  formato_playoffs?: FormatoPlayoff;
  
  modalidad: string;
  
  // 🔥 ACTUALIZAR ESTA LÍNEA - Usar el tipo EstadoTorneo
  estado?: EstadoTorneo;
  
  dias_por_semana: number;
  partidos_por_dia: number;
  hora_ini: string;
  hora_fin: string;
  slot_min: number;
  creado_por?: number;
  creado_en?: string;
}

export interface Cancha {
  id_cancha?: number;
  nombre: string;
  ubicacion: string;
}

export interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
  id_torneo?: number;
}

export interface Arbitro {
  id_torneo: number;
  id_usuario: number;
  activo: number;
}

export interface Match {
  id_partido: number;
  id_torneo: number;
  fecha: string;
  hora: string;
  estado: string;
  cancha: { id: number; nombre: string } | null;
  local: { id: number; nombre: string };
  visitante: { id: number; nombre: string };
}