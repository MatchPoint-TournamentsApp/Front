import { Routes } from '@angular/router';
import { authGuard } from './core/auth';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.page').then(m => m.HomePage) },
  { path: 'entrar', loadComponent: () => import('./pages/auth.page').then(m => m.AuthPage), data: { mode: 'login' } },
  { path: 'registro', loadComponent: () => import('./pages/auth.page').then(m => m.AuthPage), data: { mode: 'register' } },
  { path: 'torneos', loadComponent: () => import('./pages/explore.page').then(m => m.ExplorePage) },
  { path: 't/:slug', loadComponent: () => import('./pages/public-tournament.page').then(m => m.PublicTournamentPage) },
  {
    path: 'panel', canActivate: [authGuard], children: [
      { path: '', loadComponent: () => import('./pages/panel/dashboard.page').then(m => m.DashboardPage) },
      { path: 'club/nuevo', loadComponent: () => import('./pages/panel/club-form.page').then(m => m.ClubFormPage) },
      { path: 'club/:id/editar', loadComponent: () => import('./pages/panel/club-form.page').then(m => m.ClubFormPage) },
      { path: 'club/:id', loadComponent: () => import('./pages/panel/club.page').then(m => m.ClubPage) },
      { path: 'club/:clubId/torneo/nuevo', loadComponent: () => import('./pages/panel/tournament-new.page').then(m => m.TournamentNewPage) },
      { path: 'torneo/:id', loadComponent: () => import('./pages/panel/tournament.page').then(m => m.TournamentPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
