import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TournamentsService, Torneo, SearchResponse } from '../../../../services/tournaments.service';

@Component({
  selector: 'app-tournaments-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './tournaments-section.component.html',
  styleUrls: ['./tournaments-section.component.css']
})
export class TournamentsSectionComponent {
  @Output() search = new EventEmitter<string>();
  private svc = inject(TournamentsService);
  private router = inject(Router);

  query = new FormControl('', { nonNullable: true, validators: [Validators.minLength(1)] });
  loading = false; error = ''; match: Torneo | null = null; suggestions: Torneo[] = [];

  onSubmit() {
    const q = this.query.value.trim(); if (!q) return;
    this.loading = true; this.error = ''; this.match = null; this.suggestions = [];
    this.svc.search(q, 10).subscribe({
      next: (res: SearchResponse) => { this.match = res.match; this.suggestions = res.suggestions ?? []; this.loading = false; },
      error: (e) => { this.error = e?.error?.detail || 'No se pudo buscar.'; this.loading = false; }
    });
  }
  goTo(t: Torneo) {
    this.router.navigate(['/torneos', t.id_torneo]);
  }
}

