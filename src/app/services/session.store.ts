// src/app/services/session.store.ts
import { Injectable, inject, signal } from '@angular/core';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private af = inject(Auth);

  user = signal<User | null>(null);
  loading = signal(true);

  constructor() {
    onAuthStateChanged(this.af, (u) => {
      this.user.set(u);
      this.loading.set(false);
      // console.log('auth state =>', u?.uid);
    });
  }
}
