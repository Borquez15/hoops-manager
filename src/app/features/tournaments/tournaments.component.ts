// src/app/features/tournaments/tournaments.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-8"><h1>Mis Torneos</h1></div>`
})
export class TournamentsComponent {}