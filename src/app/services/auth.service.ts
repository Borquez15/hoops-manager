// services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  authState
} from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from '../../environment/environment';

export interface UsuarioNativo {
  id_usuario: number;
  nombre: string;
  ap_p: string;
  ap_m?: string | null;
  email: string;
  activo: boolean;
}

interface LoginResponse {
  user: UsuarioNativo;
  access_token: string;
  token_type: string;
}

interface FirebaseResponse {
  user: {
    id: number;
    nombre: string;
    ap_p?: string;
    ap_m?: string;
    email: string;
  };
  access_token: string;
  token_type: string;
}

interface RegisterData {
  nombre: string;
  ap_p: string;
  ap_m?: string | null;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private af = inject(Auth);
  private http = inject(HttpClient);

  user$ = authState(this.af).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  isLoggedIn$ = this.user$.pipe(map(Boolean), shareReplay({ bufferSize: 1, refCount: true }));

  get currentUser() { 
    return this.af.currentUser; 
  }

  // ============================================
  // LOGIN NATIVO
  // ============================================
  async loginNative(email: string, password: string): Promise<UsuarioNativo> {
    try {
      console.log('🔵 Iniciando login nativo...');
      
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(
          `${environment.apiBase}/api/auth/login`,
          { email, password },
          { withCredentials: true }
        )
      );
      
      console.log('✅ Response del backend:', response);
      
      // Guardar token JWT
      if (response.access_token) {
        localStorage.setItem('auth_token', response.access_token);
        console.log('✅ Token JWT guardado');
      }
      
      // Guardar usuario
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('auth_method', 'native');
        console.log('✅ Usuario nativo guardado');
      }
      
      return response.user;
      
    } catch (error) {
      console.error('❌ Error en loginNative:', error);
      throw error;
    }
  }

  // ============================================
  // REGISTRO NATIVO
  // ============================================
  async registerNative(data: RegisterData) {
    try {
      console.log('🔵 Registrando usuario nativo...');
      
      const response = await firstValueFrom(
        this.http.post<any>(
          `${environment.apiBase}/api/auth/register`,
          data
        )
      );
      
      console.log('✅ Usuario registrado:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error en registerNative:', error);
      throw error;
    }
  }

  // ============================================
  // LOGIN CON GOOGLE
  // ============================================
  async loginGoogle() {
    try {
      console.log('🔵 Iniciando login con Google...');
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(this.af, provider);
      const idToken = await result.user.getIdToken();
      
      console.log('✅ Token de Firebase obtenido');
      
      const response = await firstValueFrom(
        this.http.post<FirebaseResponse>(
          `${environment.apiBase}/api/auth/firebase`,
          { idToken },
          { withCredentials: true }
        )
      );
      
      console.log('✅ Response del backend:', response);
      
      // Guardar token JWT
      if (response.access_token) {
        localStorage.setItem('auth_token', response.access_token);
        console.log('✅ Token JWT guardado');
      }
      
      // Guardar usuario
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('auth_method', 'firebase');
        console.log('✅ Usuario Firebase guardado');
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Error en loginGoogle:', error);
      throw error;
    }
  }

  // ============================================
  // LOGOUT
  // ============================================
  async logout() {
    console.log('🔵 Cerrando sesión...');
    
    const method = localStorage.getItem('auth_method');
    
    // Limpiar localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('auth_method');
    localStorage.removeItem('auth_token');
    
    console.log('✅ LocalStorage limpio');
    
    // Si era Firebase, cerrar sesión
    if (method === 'firebase' && this.currentUser) {
      await signOut(this.af);
      console.log('✅ Sesión de Firebase cerrada');
    }
    
    console.log('✅ Logout completo');
  }

  // ============================================
  // VERIFICAR AUTENTICACIÓN
  // ============================================
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    const method = localStorage.getItem('auth_method');
    
    const isAuth = !!(token && user);
    
    console.log('🔍 isAuthenticated:', {
      hasToken: !!token,
      hasUser: !!user,
      method: method,
      result: isAuth
    });
    
    return isAuth;
  }

  // ============================================
  // OBTENER TOKEN JWT
  // ============================================
  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // ============================================
  // OBTENER USUARIO ACTUAL
  // ============================================
  getCurrentUserNative(): any | null {
    const data = localStorage.getItem('user');
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error parseando usuario:', error);
      return null;
    }
  }

  // ============================================
  // OBTENER MÉTODO DE AUTENTICACIÓN
  // ============================================
  getAuthMethod(): 'native' | 'firebase' | null {
    return localStorage.getItem('auth_method') as any;
  }
}