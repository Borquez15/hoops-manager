import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { FeaturesSectionComponent } from '../../sections/features/features-section.component';
import { TournamentsSectionComponent } from '../../sections/tournaments/tournaments-section.component';
import { ContactSectionComponent } from '../../sections/contact/contact-section.component';
import { LoginModalComponent } from '../../../../auth/login-modal/login-modal.component';

const SECTION_IDS = ['inicio', 'caracteristicas', 'torneos', 'contacto'] as const;
type SectionId = typeof SECTION_IDS[number];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FeaturesSectionComponent,
    TournamentsSectionComponent,
    ContactSectionComponent,
    LoginModalComponent,         // <-- importa el modal aquí
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('snapContainer') snapContainer!: ElementRef<HTMLElement>;

  active: SectionId = 'inicio';
  year = new Date().getFullYear();

  // estado del modal
  showLogin = false;

  constructor(private router: Router) {}

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
    const ids: SectionId[] = [...SECTION_IDS];
    const els = ids.map(id => document.getElementById(id)).filter((e): e is HTMLElement => !!e);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id as SectionId;
          this.active = id;
          history.replaceState(null, '', `#${id}`);
        }
      });
    }, { root: null, threshold: 0.6 });

    els.forEach(el => observer.observe(el));
  }

  // --- Modal handlers ---
  iniciarSesion(ev?: Event) {
    ev?.preventDefault();
    this.showLogin = true;
  }

  crearTorneo(ev?: Event) {
    ev?.preventDefault();
    this.showLogin = true; // si quieres exigir login para crear
  }

  onLoginSuccess(_: any) {
    this.showLogin = false;
  }
}
