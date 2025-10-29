// src/app/features/tournament-detail/tournament-detail.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-8"><h1>Detalle del Torneo</h1></div>`
})
export class TournamentDetailComponent {}