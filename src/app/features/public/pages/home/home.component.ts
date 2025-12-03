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
  oonSearch(): void {
    const query = this.searchQuery.trim();
    
    if (!query) {
      this.clearResults();
      return;
    }

    console.log('🔍 Buscando torneo:', query);
    this.searching = true;
    this.hasSearched = true;

    const estadosPermitidos = ['ACTIVO', 'PLAYOFFS', 'FINALIZADO'];

    this.searchService.search(query).subscribe({
      next: (response: SearchResponse) => {
        console.log('✅ Resultados:', response);

        const filtrar = (t: TorneoPublico | null): TorneoPublico | null => {
          if (!t) return null;
          return estadosPermitidos.includes(t.estado.toUpperCase()) ? t : null;
        };

        this.match = filtrar(response.match);
        this.suggestions = (response.suggestions || [])
          .filter(t => estadosPermitidos.includes(t.estado.toUpperCase()));

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

  // ✅ CONFIGURACIÓN MEJORADA DEL OBSERVER
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.3) {
        const id = e.target.id as SectionId;
        
        // ✅ Actualizar la sección activa
        this.active = id;
        
        // Actualizar URL sin recargar
        history.replaceState(null, '', id === 'inicio' ? '/' : `#${id}`);
        
        console.log('📍 Sección activa:', id);
      }
    });
  }, { 
    // ✅ CONFIGURACIÓN CRÍTICA
    threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    rootMargin: '-20% 0px -60% 0px' // La sección debe estar en el 20% superior del viewport
  });

  // Observar todas las secciones
  els.forEach(el => observer.observe(el));

  // ✅ DETECTAR CUANDO ESTÁS ARRIBA DEL TODO (INICIO)
  window.addEventListener('scroll', () => {
    if (window.scrollY < 300) {
      this.active = 'inicio';
      history.replaceState(null, '', '/');
    }
  }, { passive: true });

  // ✅ DETECTAR LA SECCIÓN INICIAL AL CARGAR
  const hash = window.location.hash.replace('#', '') as SectionId;
  if (hash && SECTION_IDS.includes(hash)) {
    setTimeout(() => this.scrollTo(hash), 100);
  }
}
}