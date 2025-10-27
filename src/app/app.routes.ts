import { Routes } from '@angular/router';
import { HomeComponent } from './features/public/pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'torneos/:id', loadComponent: () =>
      import('./features/public/pages/tournament-view/tournament-view.component')
      .then(m => m.TournamentViewComponent)
  },
  { path: '**', redirectTo: '' }
];