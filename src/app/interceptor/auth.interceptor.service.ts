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
    
    // Obtener token del localStorage
    const token = localStorage.getItem('auth_token');
    
    console.log('🔵 INTERCEPTOR: ¿Token existe?', !!token);
    console.log('🔵 INTERCEPTOR: Token (primeros 50):', token?.substring(0, 50));
    
    // Si hay token, agregarlo al header
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('✅ INTERCEPTOR: Header Authorization agregado');
    } else {
      console.log('❌ INTERCEPTOR: NO hay token en localStorage');
    }
    
    // Manejar respuesta
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ INTERCEPTOR: Error HTTP', error.status, error.message);
        
        // Si es error 401 (no autorizado), redirigir al login
        if (error.status === 401) {
          console.error('Token inválido o expirado. Redirigiendo al login...');
          localStorage.removeItem('auth_token');
          this.router.navigate(['/login']);
        }
        
        return throwError(() => error);
      })
    );
  }
}