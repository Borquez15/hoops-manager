// ============================================
// auth.service.ts - VERSIÓN HÍBRIDA (Firebase + Nativo)
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
  // ✅ LOGIN NATIVO (nuevo - usa tu backend)
  // ========================================
  async loginNative(email: string, password: string): Promise<UsuarioNativo> {
    try {
      const usuario = await firstValueFrom(
        this.http.post<UsuarioNativo>(
          `${environment.apiBase}/auth/login`,
          { email, password },
          { withCredentials: true }
        )
      );
      
      // Guarda en localStorage para persistencia
      localStorage.setItem('user', JSON.stringify(usuario));
      localStorage.setItem('auth_method', 'native');
      
      return usuario;
    } catch (error) {
      console.error('Error en loginNative:', error);
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
      const usuario = await firstValueFrom(
        this.http.post<UsuarioNativo>(
          `${environment.apiBase}/auth/register`,
          data
        )
      );
      
      localStorage.setItem('user', JSON.stringify(usuario));
      localStorage.setItem('auth_method', 'native');
      
      return usuario;
    } catch (error) {
      console.error('Error en registerNative:', error);
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
  // ✅ VERIFICAR AUTENTICACIÓN (híbrido)
  // ========================================
  isAuthenticated(): boolean {
    // Verifica Firebase O autenticación nativa
    return !!this.currentUser || !!this.getCurrentUserNative();
  }

  // ========================================
  // MÉTODOS FIREBASE (los que ya tenías)
  // ========================================
  loginEmail(email: string, password: string) {
    return signInWithEmailAndPassword(this.af, email, password);
  }

  async loginGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(this.af, provider);
    
    // Intercambia con backend Firebase
    const idToken = await result.user.getIdToken();
    await this.exchangeWithBackend(idToken);
    
    localStorage.setItem('auth_method', 'firebase');
    return result;
  }

  async logout() {
    const method = localStorage.getItem('auth_method');
    
    // Limpia localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('auth_method');
    
    // Si era Firebase, cierra sesión
    if (method === 'firebase' && this.currentUser) {
      await signOut(this.af);
    }
    
    // Opcional: notifica al backend
    // await firstValueFrom(
    //   this.http.post(`${environment.apiBase}/auth/logout`, {}, { withCredentials: true })
    // );
  }

  async getIdToken(user?: User) {
    const u = user ?? await new Promise<User | null>((resolve) => {
      const unsub = onAuthStateChanged(this.af, (usr) => { unsub(); resolve(usr); });
    });
    return u ? u.getIdToken() : null;
  }

  exchangeWithBackend(idToken: string) {
    return firstValueFrom(
      this.http.post<{ user: UsuarioNativo }>(
        `${environment.apiBase}/auth/firebase`,
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
