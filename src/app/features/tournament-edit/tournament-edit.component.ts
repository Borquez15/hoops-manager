// src/app/features/tournament-edit/tournament-edit.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentService, Tournament, Arbitro, Equipo, Match } from '../../services/tournament.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-tournament-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-edit.component.html',
  styleUrls: ['./tournament-edit.component.css']
})
export class TournamentEditComponent implements OnInit {
  tournamentId!: number;
  tournament: Tournament | null = null;
  
  // Tabs
  activeTab: 'config' | 'arbitros' | 'equipos' | 'calendario' = 'config';
  
  // Data
  arbitros: Arbitro[] = [];
  equipos: Equipo[] = [];
  matches: Match[] = [];
  
  // Forms
  showArbitroForm = false;
  showEquipoForm = false;
  nuevoArbitro = '';
  nuevoEquipo = { nombre: '', logo: '🏆' };
  
  // Calendar
  showScheduleForm = false;
  scheduleDate = '';
  
  // States
  loading = true;
  error: string | null = null;
  saving = false;

  modalidades = ['3 vs 3', '5 vs 5'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentService: TournamentService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tournamentId = +params['id'];
      this.loadTournament();
    });
  }

  loadTournament(): void {
    this.loading = true;
    this.error = null;

    this.tournamentService.getTournament(this.tournamentId).subscribe({
      next: (data) => {
        this.tournament = data;
        this.loading = false;
        this.loadTabData();
      },
      error: (error: HttpErrorResponse) => {
        this.error = 'Error al cargar el torneo';
        this.loading = false;
        console.error(error);
      }
    });
  }

  loadTabData(): void {
    if (this.activeTab === 'arbitros') {
      this.loadArbitros();
    } else if (this.activeTab === 'equipos') {
      this.loadEquipos();
    } else if (this.activeTab === 'calendario') {
      this.loadMatches();
    }
  }

  changeTab(tab: 'config' | 'arbitros' | 'equipos' | 'calendario'): void {
    this.activeTab = tab;
    this.loadTabData();
  }

  // Config
  incrementar(campo: keyof Tournament): void {
    if (!this.tournament) return;
    const value = this.tournament[campo];
    if (typeof value === 'number') {
      (this.tournament as any)[campo] = value + 1;
    }
  }

  decrementar(campo: keyof Tournament): void {
    if (!this.tournament) return;
    const value = this.tournament[campo];
    if (typeof value === 'number' && value > 1) {
      (this.tournament as any)[campo] = value - 1;
    }
  }

  saveConfig(): void {
    if (!this.tournament) return;
    
    this.saving = true;
    this.tournamentService.updateTournament(this.tournamentId, this.tournament).subscribe({
      next: () => {
        alert('Configuración guardada exitosamente');
        this.saving = false;
      },
      error: (error) => {
        alert('Error al guardar la configuración');
        this.saving = false;
        console.error(error);
      }
    });
  }

  // Árbitros
  loadArbitros(): void {
    this.tournamentService.getArbitros(this.tournamentId).subscribe({
      next: (data) => this.arbitros = data,
      error: (error) => console.error(error)
    });
  }

  agregarArbitro(): void {
    if (!this.nuevoArbitro.trim()) return;

    this.tournamentService.addArbitro(this.tournamentId, this.nuevoArbitro.trim()).subscribe({
      next: (arbitro) => {
        this.arbitros.push(arbitro);
        this.nuevoArbitro = '';
        this.showArbitroForm = false;
      },
      error: (error) => {
        alert('Error al agregar árbitro');
        console.error(error);
      }
    });
  }

  eliminarArbitro(id: number): void {
    if (!confirm('¿Eliminar este árbitro?')) return;

    this.tournamentService.deleteArbitro(this.tournamentId, id).subscribe({
      next: () => {
        this.arbitros = this.arbitros.filter(a => a.id !== id);
      },
      error: (error) => {
        alert('Error al eliminar árbitro');
        console.error(error);
      }
    });
  }

  cancelarArbitro(): void {
    this.nuevoArbitro = '';
    this.showArbitroForm = false;
  }

  // Equipos
  loadEquipos(): void {
    this.tournamentService.getEquipos(this.tournamentId).subscribe({
      next: (data) => this.equipos = data,
      error: (error) => console.error(error)
    });
  }

  agregarEquipo(): void {
    if (!this.nuevoEquipo.nombre.trim()) return;

    this.tournamentService.addEquipo(this.tournamentId, this.nuevoEquipo).subscribe({
      next: (equipo) => {
        this.equipos.push(equipo);
        this.nuevoEquipo = { nombre: '', logo: '🏆' };
        this.showEquipoForm = false;
      },
      error: (error) => {
        alert('Error al agregar equipo');
        console.error(error);
      }
    });
  }

  eliminarEquipo(id: number): void {
    if (!confirm('¿Eliminar este equipo?')) return;

    this.tournamentService.deleteEquipo(this.tournamentId, id).subscribe({
      next: () => {
        this.equipos = this.equipos.filter(e => e.id_equipo !== id);
      },
      error: (error) => {
        alert('Error al eliminar equipo');
        console.error(error);
      }
    });
  }

  cancelarEquipo(): void {
    this.nuevoEquipo = { nombre: '', logo: '🏆' };
    this.showEquipoForm = false;
  }

  // Calendario
  loadMatches(): void {
    this.tournamentService.getMatches(this.tournamentId).subscribe({
      next: (data) => this.matches = data,
      error: (error) => console.error(error)
    });
  }

  generarCalendario(): void {
    if (!this.scheduleDate) {
      alert('Selecciona una fecha de inicio');
      return;
    }

    if (!confirm('¿Generar calendario automático? Esto creará todos los partidos.')) return;

    this.tournamentService.autoSchedule(this.tournamentId, this.scheduleDate, false).subscribe({
      next: (response) => {
        alert(`¡Calendario generado! ${response.partidos_creados} partidos creados`);
        this.loadMatches();
        this.showScheduleForm = false;
      },
      error: (error) => {
        alert('Error al generar calendario');
        console.error(error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/tournament-list']);
  }
}