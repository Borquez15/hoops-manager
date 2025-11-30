import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // ============================================
  // RUTAS PÚBLICAS (SIN AUTENTICACIÓN)
  // ============================================
  
  // ✅ BÚSQUEDA - SOLO UNA VEZ, AL PRINCIPIO
  {
    path: 'buscar',
    loadComponent: () =>
      import('./features/public/pages/tournament-search/tournament-search.component')
        .then(m => m.TournamentSearchComponent)
  },

  // Home
  {
    path: '',
    loadComponent: () => 
      import('./features/public/pages/home/home.component')
        .then(m => m.HomeComponent)
  },
  
  // Vista pública de torneo
  {
    path: 'torneos/:id',
    loadComponent: () =>
      import('./features/public/pages/tournament-view/tournament-view.component')
        .then(m => m.TournamentViewComponent)
  },

  // Aceptar árbitro
  {
    path: 'aceptar-arbitro',
    loadComponent: () =>
      import('./auth/accept-referee-invite/accept-referee-invite.component')
        .then(m => m.AcceptRefereeInviteComponent)
  },

  // Verificar email
  {
    path: 'verificar-email',
    loadComponent: () =>
      import('./auth/verify-email/verify-email.component')
        .then(m => m.VerifyEmailComponent)
  },

  // ============================================
  // RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
  // ============================================
  
  // Dashboard
  {
    path: 'dashboard',
    loadComponent: () => 
      import('./features/dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },

  // Mis torneos
  {
    path: 'mis-torneos',
    loadComponent: () => 
      import('./features/tournament-list/tournament-list.component')
        .then(m => m.TournamentListComponent),
    canActivate: [authGuard]
  },

  // Crear torneo
  {
    path: 'crear-torneo',
    loadComponent: () => 
      import('./features/create-tournament/create-tournament.component')
        .then(m => m.CrearTorneoComponent),
    canActivate: [authGuard]
  },

  // Detalle de torneo (gestión)
  {
    path: 'torneo/:id/admin',
    loadComponent: () => 
      import('./features/tournament-detail/tournament-detail.component')
        .then(m => m.TournamentDetailComponent),
    canActivate: [authGuard]
  },

  // Dashboard de árbitro
  {
    path: 'arbitro',
    loadComponent: () => 
      import('./features/referee/referee-dashboard/referee-dashboard.component')
        .then(m => m.RefereeDashboardComponent),
    canActivate: [authGuard]
  },

  // Partido en vivo (árbitro)
  {
    path: 'arbitro/partido/:id',
    loadComponent: () => 
      import('./features/referee/match-live/match-live.component')
        .then(m => m.MatchLiveComponent),
    canActivate: [authGuard]
  },

  // Reporte de partido
  {
    path: 'arbitro/reporte/:id',
    loadComponent: () => 
      import('./features/referee/match-report/match-report.component')
        .then(m => m.MatchReportComponent),
    canActivate: [authGuard]
  },

  // Partido en vivo (general)
  {
    path: 'partido/:id',
    loadComponent: () => 
      import('./features/match-live/match-live.component')
        .then(m => m.MatchLiveComponent),
    canActivate: [authGuard]
  },

  // Perfil
  {
    path: 'perfil',
    loadComponent: () => 
      import('./features/profile/profile.component')
        .then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },

  // ============================================
  // RUTA 404 - DEBE SER LA ÚLTIMA
  // ============================================
  {
    path: '**',
    redirectTo: ''
  }
];