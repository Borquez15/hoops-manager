import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private af: Auth, private http: HttpClient) {}

  loginEmail(email: string, password: string) {
    return signInWithEmailAndPassword(this.af, email, password);
  }
  loginGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(this.af, provider);
  }
  async logout(){ await signOut(this.af); }

  async getIdToken(user?: User) {
    const u = user ?? this.af.currentUser ?? await new Promise<User|null>(r => {
      const unsub = this.af.onAuthStateChanged(x => { unsub(); r(x); });
    });
    return u ? u.getIdToken() : null;
  }

  // opcional: intercambiar por JWT propio en tu backend Python
  exchangeWithBackend(idToken: string) {
    return firstValueFrom(this.http.post<{token:string; user:any}>(`${environment.apiBase}/auth/firebase`, { idToken }));
  }
}
