// src/app/models/tournament.model.ts

export type Modalidad = '3v3' | '5v5';
export type EstadoTorneo = 'DRAFT' | 'ACTIVO' | 'FINALIZADO';

export interface Tournament {
  id_torneo: number;
  nombre: string;
  vueltas: number;
  cupos_playoffs: number;
  modalidad: Modalidad;  // ✅ Tipo literal, no string genérico
  dias_por_semana: number;
  partidos_por_dia: number;
  hora_ini: string;
  hora_fin: string;
  slot_min: number;
  estado?: EstadoTorneo;
  creado_por?: number;
  creado_en?: string;
  usuario_id?: string;
  created_at?: string;
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