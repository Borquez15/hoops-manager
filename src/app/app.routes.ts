import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Ruta pública (Home)
  {
    path: '',
    loadComponent: () => 
      import('./features/public/pages/home/home.component')
        .then(m => m.HomeComponent)
  },
  
  // Vista pública de torneo (sin auth)
  {
    path: 'torneos/:id',
    loadComponent: () =>
      import('./features/public/pages/tournament-view/tournament-view.component')
        .then(m => m.TournamentViewComponent)
  },

  // ============================================
  // RUTAS PROTEGIDAS (requieren autenticación)
  // ============================================
  
  // Dashboard (crea este componente después)
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

  // Perfil
  {
    path: 'perfil',
    loadComponent: () => 
      import('./features/profile/profile.component')
        .then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },

  // Ruta 404 - redirige al home
  {
    path: '**',
    redirectTo: ''
  }
];