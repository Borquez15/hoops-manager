// src/app/features/profile/profile.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-8"><h1>Mi Perfil</h1></div>`
})
export class ProfileComponent {}