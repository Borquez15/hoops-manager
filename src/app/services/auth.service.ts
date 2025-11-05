// ============================================
// auth.service.ts - VERSIÓN HÍBRIDA (Firebase + Nativo) - ACTUALIZADO
// ============================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  authState
} from '@angular/fire/auth';
import { firstValueFrom, from, of } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../environment/environment';

export interface UsuarioNativo {
  id_usuario: number;
  nombre: string;
  ap_p: string;
  ap_m?: string | null;
  email: string;
  activo: boolean;
}

// ========== INTERFACES PARA RESPONSES ==========
interface LoginResponse {
  user: UsuarioNativo;
  access_token: string;
  token_type: string;
}

interface FirebaseResponse {
  user: {
    id: number;
    nombre: string;
    email: string;
  };
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private af   = inject(Auth);
  private http = inject(HttpClient);

  // Observable del usuario Firebase (null si no hay sesión)
  user$ = authState(this.af).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  isLoggedIn$ = this.user$.pipe(map(Boolean), shareReplay({ bufferSize: 1, refCount: true }));
  idToken$ = this.user$.pipe(
    switchMap(u => u ? from(u.getIdToken()) : of(null)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  get currentUser() { return this.af.currentUser; }

  // ========================================
  // ✅ LOGIN NATIVO (ACTUALIZADO - guarda token JWT)
  // ========================================
  async loginNative(email: string, password: string): Promise<UsuarioNativo> {
    try {
      console.log('🔵 Iniciando login nativo...');
      
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(
          `${environment.apiBase}/auth/login`,
          { email, password },
          { withCredentials: true }
        )
      );
      
      console.log('✅ Response del backend:', response);
      
      // ========== GUARDAR TOKEN JWT (CRÍTICO) ==========
      if (response.access_token) {
        localStorage.setItem('auth_token', response.access_token);
        console.log('✅ Token JWT guardado en localStorage');
        console.log('✅ Token (primeros 50):', response.access_token.substring(0, 50));
      } else {
        console.error('❌ No se recibió access_token del backend');
        throw new Error('No se recibió token del servidor');
      }
      
      // Guarda usuario en localStorage para persistencia
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('auth_method', 'native');
        console.log('✅ Usuario guardado:', response.user);
        console.log('✅ auth_method guardado: native');
      }
      
      // VERIFICACIÓN POST-LOGIN
      console.log('==== VERIFICACIÓN POST-LOGIN ====');
      console.log('auth_token existe:', !!localStorage.getItem('auth_token'));
      console.log('user existe:', !!localStorage.getItem('user'));
      console.log('auth_method:', localStorage.getItem('auth_method'));
      console.log('isAuthenticated():', this.isAuthenticated());
      console.log('================================');
      
      return response.user;
      
    } catch (error) {
      console.error('❌ Error en loginNative:', error);
      throw error;
    }
  }

  // ========================================
  // ✅ REGISTRO NATIVO (mejorado)
  // ========================================
  async registerNative(data: {
    nombre: string;
    ap_p: string;
    ap_m?: string | null;
    email: string;
    password: string;
  }): Promise<UsuarioNativo> {
    try {
      console.log('🔵 Registrando usuario nativo...');
      
      const usuario = await firstValueFrom(
        this.http.post<UsuarioNativo>(
          `${environment.apiBase}/auth/register`,
          data
        )
      );
      
      console.log('✅ Usuario registrado:', usuario);
      
      localStorage.setItem('user', JSON.stringify(usuario));
      localStorage.setItem('auth_method', 'native');
      
      return usuario;
      
    } catch (error) {
      console.error('❌ Error en registerNative:', error);
      throw error;
    }
  }

  // ========================================
  // ✅ OBTENER USUARIO NATIVO ACTUAL
  // ========================================
  getCurrentUserNative(): UsuarioNativo | null {
    const method = localStorage.getItem('auth_method');
    if (method !== 'native') return null;
    
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  }

  // ========================================
  // ✅ VERIFICAR AUTENTICACIÓN (CON LOGS DE DEBUG)
  // ========================================
  isAuthenticated(): boolean {
    console.log('==== 🔍 isAuthenticated() EJECUTÁNDOSE ====');
    
    // Verificar cada condición por separado
    const token = localStorage.getItem('auth_token');
    const method = localStorage.getItem('auth_method');
    const user = localStorage.getItem('user');
    const hasFirebase = !!this.currentUser;
    const hasNative = !!this.getCurrentUserNative();
    
    console.log('🔵 Token existe:', !!token);
    console.log('🔵 Token (primeros 30):', token ? token.substring(0, 30) + '...' : 'null');
    console.log('🔵 Método:', method);
    console.log('🔵 User existe:', !!user);
    console.log('🔵 Firebase user:', hasFirebase);
    console.log('🔵 Native user:', hasNative);
    
    // Verificar condiciones
    const isAuth = hasFirebase || hasNative || !!token;
    
    console.log('🔵 RESULTADO:', isAuth);
    console.log('==========================================');
    
    return isAuth;
  }

  // ========================================
  // ✅ OBTENER TOKEN JWT
  // ========================================
  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // ========================================
  // MÉTODOS FIREBASE (actualizados)
  // ========================================
  loginEmail(email: string, password: string) {
    return signInWithEmailAndPassword(this.af, email, password);
  }

  async loginGoogle() {
    try {
      console.log('🔵 Iniciando login con Google...');
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.af, provider);
      
      // Intercambia con backend Firebase
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
      
      // ========== GUARDAR TOKEN JWT (CRÍTICO) ==========
      if (response.access_token) {
        localStorage.setItem('auth_token', response.access_token);
        console.log('✅ Token JWT guardado en localStorage');
      }
      
      // Guardar usuario
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        console.log('✅ Usuario guardado:', response.user);
      }
      
      localStorage.setItem('auth_method', 'firebase');
      
      return result;
      
    } catch (error) {
      console.error('❌ Error en loginGoogle:', error);
      throw error;
    }
  }

  async logout() {
    console.log('🔵 Cerrando sesión...');
    
    const method = localStorage.getItem('auth_method');
    
    // Limpia localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('auth_method');
    localStorage.removeItem('auth_token');  // ← CRÍTICO: Eliminar token
    
    console.log('✅ LocalStorage limpio');
    
    // Si era Firebase, cierra sesión
    if (method === 'firebase' && this.currentUser) {
      await signOut(this.af);
      console.log('✅ Sesión de Firebase cerrada');
    }
    
    console.log('✅ Logout completo');
  }

  async getIdToken(user?: User) {
    const u = user ?? await new Promise<User | null>((resolve) => {
      const unsub = onAuthStateChanged(this.af, (usr) => { unsub(); resolve(usr); });
    });
    return u ? u.getIdToken() : null;
  }

  exchangeWithBackend(idToken: string) {
    return firstValueFrom(
      this.http.post<FirebaseResponse>(
        `${environment.apiBase}/api/auth/firebase`,
        { idToken },
        { withCredentials: true }
      )
    );
  }

  async register(nombre: string, ap_p: string, ap_m: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(this.af, email, password);
    await updateProfile(cred.user, { displayName: nombre });
    return cred;
  }

  sendVerificationEmail() {
    const user = this.af.currentUser;
    if (!user) return Promise.resolve();
    const url = `${location.origin}/#/verificado`;
    return sendEmailVerification(user, { url, handleCodeInApp: false });
  }
}