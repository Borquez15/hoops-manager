// src/app/interceptors/auth.interceptor.service.ts
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
    // Obtener token del localStorage
    const token = localStorage.getItem('auth_token');
    
    // Si hay token, agregarlo al header
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    // Manejar respuesta
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
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