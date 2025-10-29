import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Verifica si hay usuario autenticado
  if (auth.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado, redirige al home
  console.warn('⚠️ Acceso denegado - usuario no autenticado');
  router.navigate(['/']);
  return false;
};