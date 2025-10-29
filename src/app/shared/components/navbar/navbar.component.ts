import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  menuOpen = false;
  user = this.auth.getCurrentUserNative();
  isAuthenticated = !!this.user;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  async logout() {
    await this.auth.logout();
    this.menuOpen = false;
    this.router.navigate(['/']);
  }

  closeMenu() {
    this.menuOpen = false;
  }
}
