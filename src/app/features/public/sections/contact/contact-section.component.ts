import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-section.component.html',
  styleUrls: ['./contact-section.component.css']
})
export class ContactSectionComponent {
  /** Ajusta estos enlaces según tus redes */
  @Input() instagramUrl = 'https://instagram.com/borquez15.c/';
  @Input() facebookUrl  = 'https://facebook.com/angelfernando.borquezcastro.7';
  @Input() email        = 'contacto@hoopsmanager.com';

  /** Cambia la ruta del logo si es necesario */
  @Input() logoSrc = '/public/imagen/Logo2.png';
}
