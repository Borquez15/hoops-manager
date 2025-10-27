import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentsService, Torneo } from '../../../../services/tournaments.service';

@Component({
  standalone: true,
  selector: 'app-tournament-view',
  imports: [CommonModule],
  template: `
  <section class="screen">
    <div class="card-navy">
      <button class="link" type="button" (click)="back()">← Regresar</button>

      <ng-container *ngIf="loading">Cargando…</ng-container>
      <ng-container *ngIf="!loading && error" class="err">{{ error }}</ng-container>

      <ng-container *ngIf="!loading && !error && torneo">
        <h2 style="margin-top:8px">{{ torneo.nombre }}</h2>
        <div class="info">
          <div><b>Modalidad:</b> {{ torneo.modalidad }}</div>
          <div><b>Vueltas:</b> {{ torneo.vueltas }}</div>
          <div><b>Cupos playoffs:</b> {{ torneo.cupos_playoffs }}</div>
          <div><b>Máx/semana:</b> {{ torneo.max_partidos_semana }}</div>
          <div><b>Máx/día:</b> {{ torneo.max_partidos_dia ?? '—' }}</div>
          <div><b>Estado:</b> {{ torneo.estado }}</div>
        </div>

        <!-- Aquí luego podrás colgar tabs de Equipos, Calendario, Tabla, etc. -->
      </ng-container>
    </div>
  </section>
  `,
  styles: [`
  .screen{
    background:#fff; min-height:100dvh; display:flex; justify-content:center; align-items:flex-start;
    padding:72px 16px 96px;
  }
  .card-navy{
    width:min(800px, 88vw); background:#1e2946; color:#eef2f8; border-radius:26px; padding:36px 28px;
    box-shadow:0 18px 36px rgba(0,0,0,.30), 0 2px 0 0 #e57f3d inset;
  }
  .link{ background:transparent; border:none; color:#c6cfdf; cursor:pointer; font-weight:600; }
  .err{ color:#ffb3b3; }
  .info{ display:grid; gap:8px; margin-top:12px; }
  `]
})
export class TournamentViewComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(TournamentsService);

  loading = true;
  error = '';
  torneo: Torneo | null = null;

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getById(id).subscribe({
      next: (t) => { this.torneo = t; this.loading = false; },
      error: (e) => { this.error = e?.error?.detail || 'No se pudo cargar el torneo.'; this.loading = false; }
    });
  }

  back() {
    this.router.navigate(['']); // vuelve al home (donde está tu buscador)
  }
}
