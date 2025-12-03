// pages/public/pages/home/home.component.ts
import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { FeaturesSectionComponent } from '../../sections/features/features-section.component';
import { TournamentsSectionComponent } from '../../sections/tournaments/tournaments-section.component';
import { ContactSectionComponent } from '../../sections/contact/contact-section.component';
import { LoginModalComponent } from '../../../../auth/login-modal/login-modal.component';
import { RegisterModalComponent } from '../../../../auth/register-modal/register-modal.component';
import { ForgotPasswordModalComponent } from '../../../../auth/forgot-password/forgot-password-modal.component';
import { AuthService } from '../../../../services/auth.service';
import { TournamentSearchService, TorneoPublico, SearchResponse } from '../../../../services/tournament-search.service';


const SECTION_IDS = ['inicio', 'caracteristicas', 'torneos', 'contacto'] as const;
type SectionId = typeof SECTION_IDS[number];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FeaturesSectionComponent,
    TournamentsSectionComponent,
    ContactSectionComponent,
    LoginModalComponent,
    RegisterModalComponent,
    ForgotPasswordModalComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('snapContainer') snapContainer!: ElementRef<HTMLElement>;

  private auth = inject(AuthService);
  private router = inject(Router);
  private searchService = inject(TournamentSearchService);

  active: SectionId = 'inicio';
  year = new Date().getFullYear();

  // Estado de modales
  showLogin = false;
  showRegister = false;
  showForgot = false;

  // Estado de autenticación
  user: any = null;
  isAuthenticated = false;
  menuOpen = false;

  // Estado de búsqueda
  searchQuery = '';
  searching = false;
  hasSearched = false;
  match: TorneoPublico | null = null;
  suggestions: TorneoPublico[] = [];

  constructor() {
    this.loadUser();
  }

  private loadUser() {
    console.log('🔵 Cargando usuario...');
    
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        this.user = JSON.parse(userData);
        this.isAuthenticated = true;
        console.log('✅ Usuario cargado desde localStorage:', this.user);
      } catch (error) {
        console.error('❌ Error parseando usuario:', error);
        this.logout();
      }
    } else {
      console.log('⚠️ No hay usuario en localStorage');
    }
  }

  iniciarSesion(ev?: Event) {
    ev?.preventDefault();
    
    if (this.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    } else {
      this.showLogin = true;
    }
  }

  crearTorneo(ev?: Event) {
    ev?.preventDefault();
    
    if (this.isAuthenticated) {
      this.router.navigate(['/crear-torneo']);
    } else {
      this.showLogin = true;
    }
  }

  onLoginSuccess(data: any) {
    console.log('✅ Login exitoso:', data);
    this.showLogin = false;
    
    this.user = data.user;
    this.isAuthenticated = true;
    
    console.log('¡Bienvenido!', this.user.nombre || this.user.email);
  }

  onRegisterSuccess(data: any) {
    console.log('✅ Registro exitoso:', data);
    this.showRegister = false;
    
    console.log('📧 Revisa tu email para verificar tu cuenta');
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    
    if (this.menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMenu() {
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  async logout() {
    await this.auth.logout();
    this.menuOpen = false;
    this.user = null;
    this.isAuthenticated = false;
    document.body.style.overflow = '';
    
    window.location.href = '/';
  }

  onSearch(): void {
    const query = this.searchQuery.trim();
    
    if (!query) {
      this.clearResults();
      return;
    }

    console.log('🔍 Buscando torneo:', query);
    this.searching = true;
    this.hasSearched = true;

    this.searchService.search(query).subscribe({
      next: (response: SearchResponse) => {
        console.log('✅ Resultados:', response);
        this.match = response.match;
        this.suggestions = response.suggestions;
        this.searching = false;
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.clearResults();
        this.searching = false;
      }
    });
  }

  clearResults(): void {
    this.match = null;
    this.suggestions = [];
    this.hasSearched = false;
  }

  viewTournament(torneo: TorneoPublico): void {
    this.router.navigate(['/torneos', torneo.id_torneo]);
  }

  getEstadoBadge(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'ACTIVO': return '🟢 Activo';
      case 'FINALIZADO': return '⚫ Finalizado';
      case 'DRAFT': return '🔴 Borrador';
      default: return estado || 'Desconocido';
    }
  }

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

    const element = document.getElementById(id);
    if (!element) return;

    // 🔒 FORZAR NAVEGACIÓN SIN SCROLL MANUAL
    window.scrollTo({
      top: element.offsetTop,
      behavior: 'instant' as ScrollBehavior
    });
  }

  ngAfterViewInit(): void {

    // 🔒 BLOQUEAR SCROLL COMPLETAMENTE
    document.body.style.overflow = 'hidden';

    // Previene scroll con rueda
    window.addEventListener('wheel', e => e.preventDefault(), { passive: false });

    // Previene scroll táctil
    window.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    // Previene scroll con teclado
    window.addEventListener('keydown', e => {
      if (['ArrowUp','ArrowDown','PageUp','PageDown','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    const els = (SECTION_IDS as readonly SectionId[])
      .map(id => document.getElementById(id))
      .filter((e): e is HTMLElement => !!e);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.3) {
          const id = e.target.id as SectionId;
          this.active = id;
          history.replaceState(null, '', id === 'inicio' ? '/' : `#${id}`);
          console.log('📍 Sección activa:', id);
        }
      });
    }, { 
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      rootMargin: '-20% 0px -60% 0px'
    });

    els.forEach(el => observer.observe(el));

    window.addEventListener('scroll', () => {
      if (window.scrollY < 300) {
        this.active = 'inicio';
        history.replaceState(null, '', '/');
      }
    }, { passive: true });

    const hash = window.location.hash.replace('#', '') as SectionId;
    if (hash && SECTION_IDS.includes(hash)) {
      setTimeout(() => this.scrollTo(hash), 100);
    }
  }
}
