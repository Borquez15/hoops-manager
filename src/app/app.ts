import { Component } from '@angular/core';
import { HomeComponent } from './features/public/pages/home/home.component';
// Importa RouterOutlet SOLO si vas a usar <router-outlet> en app.html
// import { RouterOutlet } from '@angular/router';
import { LoginModalComponent } from './auth/login-modal/login-modal.component';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HomeComponent, RouterOutlet, NavbarComponent], // Si no usas <router-outlet>, no lo importes
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}

