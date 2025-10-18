import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  year = new Date().getFullYear();

  crearTorneo() {
    // Por ahora sin router: luego redirigimos a /auth/login
    console.log('Crear torneo (redir a login)');
  }

  iniciarSesion() {
    console.log('Iniciar sesión (redir a login)');
  }
}
