import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiConfigService } from '../../../services/api-config.service';

interface ReporteIncidencia {
  tipo: 'LESION' | 'FALTA_TECNICA' | 'FALTA_ANTIDEPORTIVA' | 'DESCALIFICACION' | 'PROTESTA' | 'OTRO';
  id_jugador?: number;
  nombre_jugador?: string;
  equipo: 'LOCAL' | 'VISITANTE';
  descripcion: string;
  periodo: number;
  tiempo: string;
}

interface Partido {
  id_partido: number;
  equipo_local: string;
  equipo_visitante: string;
  puntos_local: number;
  puntos_visitante: number;
  fecha: string;
}

@Component({
  selector: 'app-match-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './match-report.component.html',
  styleUrls: ['./match-report.component.css']
})
export class MatchReportComponent implements OnInit {
  private apiConfig = inject(ApiConfigService);
  private get apiUrl(): string { return this.apiConfig.apiBase; }
  private partidoId!: number;

  partido?: Partido;
  loading = true;
  error = '';

  incidencias: ReporteIncidencia[] = [];
  nuevaIncidencia: ReporteIncidencia = {
    tipo: 'OTRO',
    equipo: 'LOCAL',
    descripcion: '',
    periodo: 1,
    tiempo: '00:00'
  };

  modalIncidenciaAbierto = false;
  enviandoReporte = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.partidoId = +this.route.snapshot.params['id'];
    this.loadPartido();
  }

  async loadPartido(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.http.get<any>(
        `${this.apiUrl}/matches/${this.partidoId}`,
        { withCredentials: true }
      ).toPromise();

      if (!response) throw new Error('No se pudo cargar el partido');

      this.partido = {
        id_partido: response.id_partido,
        equipo_local: response.equipo_local.nombre,
        equipo_visitante: response.equipo_visitante.nombre,
        puntos_local: response.equipo_local.puntos || 0,
        puntos_visitante: response.equipo_visitante.puntos || 0,
        fecha: response.fecha
      };

      console.log('✅ Partido cargado para reporte');
    } catch (error) {
      console.error('❌ Error al cargar partido:', error);
      this.error = 'Error al cargar el partido';
    } finally {
      this.loading = false;
    }
  }

  abrirModalIncidencia(): void {
    this.nuevaIncidencia = {
      tipo: 'OTRO',
      equipo: 'LOCAL',
      descripcion: '',
      periodo: 1,
      tiempo: '00:00'
    };
    this.modalIncidenciaAbierto = true;
  }

  cerrarModalIncidencia(): void {
    this.modalIncidenciaAbierto = false;
  }

  agregarIncidencia(): void {
    if (!this.nuevaIncidencia.descripcion.trim()) {
      alert('⚠️ Debes agregar una descripción');
      return;
    }

    this.incidencias.push({ ...this.nuevaIncidencia });
    console.log('✅ Incidencia agregada:', this.nuevaIncidencia);
    this.cerrarModalIncidencia();
  }

  eliminarIncidencia(index: number): void {
    if (confirm('¿Eliminar esta incidencia?')) {
      this.incidencias.splice(index, 1);
    }
  }

  getTipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'LESION': '🤕 Lesión',
      'FALTA_TECNICA': '⚠️ Falta Técnica',
      'FALTA_ANTIDEPORTIVA': '🚨 Falta Antideportiva',
      'DESCALIFICACION': '🚫 Descalificación',
      'PROTESTA': '🗣️ Protesta',
      'OTRO': '📝 Otra Incidencia'
    };
    return labels[tipo] || tipo;
  }

  async enviarReporte(): Promise<void> {
    if (!confirm('¿Enviar reporte del partido? Esta acción no se puede deshacer.')) {
      return;
    }

    this.enviandoReporte = true;

    try {
      await this.http.post(
        `${this.apiUrl}/matches/${this.partidoId}/report`,
        {
          incidencias: this.incidencias,
          fecha_reporte: new Date().toISOString()
        },
        { withCredentials: true }
      ).toPromise();

      alert('✅ Reporte enviado exitosamente');
      this.router.navigate(['/arbitro']);
    } catch (error) {
      console.error('❌ Error al enviar reporte:', error);
      alert('Error al enviar el reporte');
    } finally {
      this.enviandoReporte = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/arbitro']);
  }
}
