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
  // 👇 importa esto:
  authState
} from '@angular/fire/auth';
import { firstValueFrom, from, of } from 'rxjs';
// 👇 utilidades rxjs
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private af   = inject(Auth);
  private http = inject(HttpClient);

  // 👇 Observable del usuario (null si no hay sesión)
  user$ = authState(this.af).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  // 👇 Booleano derivado (útil en plantillas)
  isLoggedIn$ = this.user$.pipe(map(Boolean), shareReplay({ bufferSize: 1, refCount: true }));

  // 👇 Token como observable (por si quieres suscribirte puntualmente)
  idToken$ = this.user$.pipe(
    switchMap(u => u ? from(u.getIdToken()) : of(null)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Helper: acceso sincrónico
  get currentUser() { return this.af.currentUser; }

  // ---- LOGIN ----
  loginEmail(email: string, password: string) {
    return signInWithEmailAndPassword(this.af, email, password);
  }

  loginGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(this.af, provider);
  }

  logout() {
    return signOut(this.af);
  }

  // ---- TOKEN (Promise) ----
  async getIdToken(user?: User) {
    const u = user ?? await new Promise<User | null>((resolve) => {
      const unsub = onAuthStateChanged(this.af, (usr) => { unsub(); resolve(usr); });
    });
    return u ? u.getIdToken() : null;
  }

  // ---- BACKEND (opcional) ----
  exchangeWithBackend(idToken: string) {
    return firstValueFrom(
      this.http.post<{ token: string; user: any }>(
        `${environment.apiBase}/auth/firebase`,
        { idToken },
        { withCredentials: true }
      )
    );
  }

  // ---- REGISTRO ----
  async register(nombre: string, ap_p: string, ap_m: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(this.af, email, password);
    await updateProfile(cred.user, { displayName: nombre});
    return cred;
  }

  // ---- VERIFICACIÓN POR CORREO (cliente) ----
  sendVerificationEmail() {
    const user = this.af.currentUser;
    if (!user) return Promise.resolve();
    const url = `${location.origin}/#/verificado`;
    return sendEmailVerification(user, { url, handleCodeInApp: false });
  }

  // ---- REGISTRO NATIVO (FastAPI) ----
  registerNative(dto: { nombre: string; ap_p: string; ap_m: string | null; email: string; password: string }) {
    return firstValueFrom(
      this.http.post<{ id_usuario: number; nombre: string; ap_p: string; ap_m: string | null; email: string }>(
        `${environment.apiBase}/auth/register`,
        dto
      )
    );
  }
}
