import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling  } from '@angular/router';

import { routes } from './app.routes';

import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';  // ← Agregar HTTP_INTERCEPTORS aquí

// ⬇️ IMPORTES DE ANGULARFIRE
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';

// ⬇️ IMPORTA TU ENVIRONMENT (tu carpeta es singular: environment)
import { environment } from '../environment/environment';

import { AuthInterceptorService } from './interceptor/auth.interceptor.service';  // ← Tu ruta es correcta

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    
    // ⬇️ REGISTRAR EL INTERCEPTOR DENTRO DEL ARRAY
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
      multi: true
    },
    
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
  ],
};