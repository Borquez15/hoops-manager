import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TournamentService } from '../../services/tournament.service';
import { TeamPlayersService, Player } from '../../services/team-players.service';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.css']
})
export class TeamDetailComponent implements OnInit {
  id_equipo!: number;
  equipoNombre = '';
  jugadores: Player[] = [];

  nuevoJugador = { curp: '', nombres: '', ap_p: '', ap_m: '', dorsal: '' };

  constructor(
    private route: ActivatedRoute,
    private teamPlayersService: TeamPlayersService,
    private tournamentService: TournamentService
  ) {}

  async ngOnInit() {
    this.id_equipo = +this.route.snapshot.params['id'];
    await this.loadJugadores();
  }

  async loadJugadores() {
    this.jugadores = await firstValueFrom(this.teamPlayersService.listarJugadores(this.id_equipo));
  }

  async agregarJugador() {
    if (!this.nuevoJugador.curp || !this.nuevoJugador.dorsal) {
      alert('⚠️ CURP y dorsal son requeridos');
      return;
    }
    try {
      await firstValueFrom(this.teamPlayersService.crearJugador(this.id_equipo, this.nuevoJugador));
      await this.loadJugadores();
      this.nuevoJugador = { curp: '', nombres: '', ap_p: '', ap_m: '', dorsal: '' };
    } catch (error: any) {
      alert('❌ ' + (error?.error?.detail || 'Error al agregar jugador'));
    }
  }

  async eliminarJugador(dorsal: number) {
    if (!confirm('¿Eliminar jugador?')) return;
    await firstValueFrom(this.teamPlayersService.eliminarJugador(this.id_equipo, dorsal));
    await this.loadJugadores();
  }
}
