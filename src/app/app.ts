import { Component } from '@angular/core';
import { HomeComponent } from './features/public/pages/home/home.component';
// Importa RouterOutlet SOLO si vas a usar <router-outlet> en app.html
// import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HomeComponent], // Si no usas <router-outlet>, no lo importes
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}

