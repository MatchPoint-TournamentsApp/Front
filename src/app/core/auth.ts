import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SupabaseService } from './supabase.service';

/** Añade el token de Supabase a las llamadas privadas de la API. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || req.url.includes('/public/')) return next(req);
  const supa = inject(SupabaseService);
  return from(supa.token()).pipe(
    switchMap(token => next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)),
  );
};

/** Rutas del panel: requieren sesión. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const supa = inject(SupabaseService);
  const router = inject(Router);
  await supa.whenReady();
  return supa.loggedIn() ? true : router.createUrlTree(['/entrar'], { queryParams: { next: state.url } });
};
