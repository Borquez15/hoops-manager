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
} from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environment/environment'; // <-- AJUSTA ESTA RUTA SI ES NECESARIO

@Injectable({ providedIn: 'root' })
export class AuthService {
  private af   = inject(Auth);
  private http = inject(HttpClient);

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

  // ---- TOKEN ----
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
    const url = `${location.origin}/#/verificado`;  // Ajusta si quieres otra ruta
    return sendEmailVerification(user, { url, handleCodeInApp: false });
  }
  // ---- REGISTRO NATIVO (FastAPI) ----
registerNative(dto: { nombre: string; ap_p: string; ap_m: string | null; email: string; password: string }) {
  // POST http://127.0.0.1:8000/auth/register
  return firstValueFrom(
    this.http.post<{ id_usuario: number; nombre: string; ap_p: string; ap_m: string | null; email: string }>(
      `${environment.apiBase}/auth/register`,
      dto
    )
  );
}

}
