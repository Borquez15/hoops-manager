// pages/public/pages/home/home.component.ts
import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
    ForgotPasswordModalComponent,
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

  // ============================================
  // CARGAR USUARIO
  // ============================================
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

  // ============================================
  // INICIAR SESIÓN
  // ============================================
  iniciarSesion(ev?: Event) {
    ev?.preventDefault();
    
    if (this.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    } else {
      this.showLogin = true;
    }
  }

  // ============================================
  // CREAR TORNEO
  // ============================================
  crearTorneo(ev?: Event) {
    ev?.preventDefault();
    
    if (this.isAuthenticated) {
      this.router.navigate(['/crear-torneo']);
    } else {
      this.showLogin = true;
    }
  }

  // ============================================
  // CALLBACKS DE LOGIN/REGISTRO
  // ============================================
  onLoginSuccess(data: any) {
    console.log('✅ Login exitoso:', data);
    this.showLogin = false;
    
    // Actualizar estado
    this.user = data.user;
    this.isAuthenticated = true;
    
    console.log('¡Bienvenido!', this.user.nombre || this.user.email);
  }

  onRegisterSuccess(data: any) {
    console.log('✅ Registro exitoso:', data);
    this.showRegister = false;
    
    // No guardamos usuario aquí porque el registro requiere verificación de email
    console.log('📧 Revisa tu email para verificar tu cuenta');
  }

  // ============================================
  // MENÚ DE USUARIO
  // ============================================
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
    
    window.location.href = '/';
  }

  // ============================================
  // BÚSQUEDA DE TORNEOS
  // ============================================
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

  // ============================================
  // NAVEGACIÓN
  // ============================================
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
    }, { 
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: '-100px 0px -50% 0px'
    });

    els.forEach(el => observer.observe(el));

    window.addEventListener('scroll', () => {
      if (window.scrollY < 200) {
        this.active = 'inicio';
        history.replaceState(null, '', '#inicio');
      }
    });
  }
}