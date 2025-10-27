import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  auth = inject(AuthService);
  router = inject(Router);

  menuOpen = false;

  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu()  { this.menuOpen = false; }

  async loginGoogle() {
    try {
      await this.auth.loginGoogle();
    } catch (e) {
      console.error('Login error', e);
    }
  }

  async logout() {
    await this.auth.logout();
    this.closeMenu();
  }

  // cerrar si hacen click fuera (si usas overlay real puedes quitarlo)
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const t = ev.target as HTMLElement;
    if (!t.closest('.nav') && !t.closest('.menu-panel')) this.closeMenu();
  }
}
