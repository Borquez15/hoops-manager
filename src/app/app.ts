import { Component } from '@angular/core';
import { HomeComponent } from './features/public/pages/home/home.component';
import { RouterOutlet } from '@angular/router'; // solo si dejas <router-outlet>

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HomeComponent, RouterOutlet], // <<-- IMPORTANTE
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
