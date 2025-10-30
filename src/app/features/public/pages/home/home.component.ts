import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { FeaturesSectionComponent } from '../../sections/features/features-section.component';
import { TournamentsSectionComponent } from '../../sections/tournaments/tournaments-section.component';
import { ContactSectionComponent } from '../../sections/contact/contact-section.component';
import { LoginModalComponent } from '../../../../auth/login-modal/login-modal.component';
import { RegisterModalComponent } from '../../../../auth/register-modal/register-modal.component';
import { AuthService } from '../../../../services/auth.service';

const SECTION_IDS = ['inicio', 'caracteristicas', 'torneos', 'contacto'] as const;
type SectionId = typeof SECTION_IDS[number];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // ← AGREGAR para routerLink
    FeaturesSectionComponent,
    TournamentsSectionComponent,
    ContactSectionComponent,
    LoginModalComponent,
    RegisterModalComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('snapContainer') snapContainer!: ElementRef<HTMLElement>;

  // ✅ NUEVO: Inyectar AuthService
  private auth = inject(AuthService);
  private router = inject(Router);

  active: SectionId = 'inicio';
  year = new Date().getFullYear();

  // Estado de modales
  showLogin = false;
  showRegister = false;

  // ✅ NUEVO: Estado de autenticación
  user = this.auth.getCurrentUserNative();
  isAuthenticated = !!this.user;
  menuOpen = false;

  // ✅ ACTUALIZADO: Botones con lógica de autenticación
  iniciarSesion(ev?: Event) {
    ev?.preventDefault();
    
    if (this.isAuthenticated) {
      // Si ya está autenticado, ir al dashboard
      this.router.navigate(['/dashboard']);
    } else {
      this.showLogin = true;
    }
  }

  crearTorneo(ev?: Event) {
    ev?.preventDefault();
    
    if (this.isAuthenticated) {
      // Si ya está autenticado, ir a crear torneo
      this.router.navigate(['/crear-torneo']);
    } else {
      // Si no, mostrar login
      this.showLogin = true;
    }
  }

  // ✅ ACTUALIZADO: Callbacks de login/registro
  onLoginSuccess(data: any) {
  console.log('✅ Login exitoso:', data.user);
  this.showLogin = false;
  
  // ✅ ACTUALIZA EL ESTADO LOCAL
  this.user = data.user;
  this.isAuthenticated = true;
  
  // ✅ USA data.user en lugar de this.user
  console.log('¡Bienvenido!', data.user.nombre);
  
  // Opcional: redirigir después de 500ms para que vea el cambio
  //setTimeout(() => {
   // this.router.navigate(['/dashboard']);
  //}, 500);
}

  onRegisterSuccess(data: any) {
  console.log('✅ Registro exitoso:', data.user);
  this.showRegister = false;
  
  // ✅ ACTUALIZA EL ESTADO LOCAL
  this.user = data.user;
  this.isAuthenticated = true;
  
  setTimeout(() => {
    this.router.navigate(['/dashboard']);
  }, 500);
}

  // ✅ NUEVO: Métodos del menú de usuario
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  async logout() {
    await this.auth.logout();
    this.menuOpen = false;
    this.user = null;
    this.isAuthenticated = false;
    
    // Recargar la página en el home
    window.location.href = '/';
  }

  // Navegación/scroll (sin cambios)
  async go(id: SectionId, ev?: Event) {
    ev?.preventDefault();
    if (this.router.url !== '/') {
      await this.router.navigateByUrl('/');
      setTimeout(() => this.scrollTo(id), 0);
    } else {
      this.scrollTo(id);
    }
  }

  private scrollTo(id: SectionId) {
    this.active = id;
    if (id === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  ngAfterViewInit(): void {
    const els = (SECTION_IDS as readonly SectionId[])
      .map(id => document.getElementById(id))
      .filter((e): e is HTMLElement => !!e);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id as SectionId;
          this.active = id;
          history.replaceState(null, '', `#${id}`);
        }
      });
    }, { threshold: 0.6 });

    els.forEach(el => observer.observe(el));
  }
}