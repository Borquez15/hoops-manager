// src/app/interceptor/auth.interceptor.service.ts
import { Injectable, inject } from '@angular/core';
import { 
  HttpEvent, 
  HttpInterceptor, 
  HttpHandler, 
  HttpRequest,
  HttpErrorResponse 
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AuthInterceptorService implements HttpInterceptor {
  private router = inject(Router);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('🔵 INTERCEPTOR: Interceptando petición a', req.url);
    
    // ✅ RUTAS PÚBLICAS QUE NO NECESITAN TOKEN
    const publicRoutes = [
      // Autenticación
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/verify-email',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/firebase',
      
      // ✅ BÚSQUEDA Y VISTA PÚBLICA DE TORNEOS
      '/api/tournaments/search',
      '/tournaments/search',
      '/tournaments/',
      '/public',
      
      // ✅ DATOS PÚBLICOS DE TORNEOS
      '/games/upcoming',
      '/standings',
      '/leaders/scorers',
      '/pdf/',
    ];

    // ✅ VERIFICAR SI ES RUTA PÚBLICA
    const isPublicRoute = publicRoutes.some(route => req.url.includes(route));

    if (isPublicRoute) {
      console.log('🔓 INTERCEPTOR: Ruta pública detectada, sin token');
      return next.handle(req).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('❌ INTERCEPTOR: Error en ruta pública', error.status);
          return throwError(() => error);
        })
      );
    }

    // ✅ PARA RUTAS PROTEGIDAS, AGREGAR TOKEN
    const token = localStorage.getItem('auth_token');
    
    console.log('🔵 INTERCEPTOR: ¿Token existe?', !!token);
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('✅ INTERCEPTOR: Header Authorization agregado');
    } else {
      console.log('⚠️ INTERCEPTOR: NO hay token para ruta protegida');
    }
    
    // Manejar respuesta
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ INTERCEPTOR: Error HTTP', error.status, error.message);
        
        // Si es error 401 (no autorizado), redirigir al login
        if (error.status === 401) {
          console.error('⚠️ Token inválido o expirado. Redirigiendo al login...');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth_method');
          this.router.navigate(['/']);
        }
        
        return throwError(() => error);
      })
    );
  }
}