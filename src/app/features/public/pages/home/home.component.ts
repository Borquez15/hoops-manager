import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { FeaturesSectionComponent } from '../../sections/features/features-section.component';
import { TournamentsSectionComponent } from '../../sections/tournaments/tournaments-section.component';
import { ContactSectionComponent } from '../../sections/contact/contact-section.component';
import { LoginModalComponent } from '../../../../auth/login-modal/login-modal.component';
import { RegisterModalComponent } from '../../../../auth/register-modal/register-modal.component';
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

  // Estado de autenticación
  user = this.auth.getCurrentUserNative();
  isAuthenticated = !!this.user;
  menuOpen = false;

  // ✅ NUEVO: Estado de búsqueda de torneos
  searchQuery = '';
  searching = false;
  hasSearched = false;
  match: TorneoPublico | null = null;
  suggestions: TorneoPublico[] = [];

  // Botones con lógica de autenticación
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

  // Callbacks de login/registro
  onLoginSuccess(data: any) {
    console.log('✅ Login exitoso:', data.user);
    this.showLogin = false;
    
    this.user = data.user;
    this.isAuthenticated = true;
    
    console.log('¡Bienvenido!', data.user.nombre);
  }

  onRegisterSuccess(data: any) {
    console.log('✅ Registro exitoso:', data.user);
    this.showRegister = false;
    
    this.user = data.user;
    this.isAuthenticated = true;
    
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 500);
  }

  // Métodos del menú de usuario
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

  // ✅ NUEVO: Método de búsqueda de torneos
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
        console.log('✅ Resultados de búsqueda:', response);
        this.match = response.match;
        this.suggestions = response.suggestions;
        this.searching = false;
      },
      error: (error) => {
        console.error('❌ Error en búsqueda:', error);
        this.clearResults();
        this.searching = false;
      }
    });
  }

  // ✅ NUEVO: Limpiar resultados
  clearResults(): void {
    this.match = null;
    this.suggestions = [];
    this.hasSearched = false;
  }

  // ✅ NUEVO: Ver torneo
  viewTournament(torneo: TorneoPublico): void {
    console.log('🏀 Navegando a torneo:', torneo.id_torneo);
    this.router.navigate(['/torneos', torneo.id_torneo]);
  }

  // ✅ NUEVO: Badge de estado
  getEstadoBadge(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'ACTIVO':
        return '🟢 Activo';
      case 'FINALIZADO':
        return '⚫ Finalizado';
      case 'DRAFT':
        return '🔴 Borrador';
      default:
        return estado || 'Desconocido';
    }
  }

  // Navegación/scroll
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