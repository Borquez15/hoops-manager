// pages/verify-email/verify-email.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);  // ✅ INYECTAR ChangeDetectorRef

  loading = true;
  success = false;
  errorMsg = '';

  ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];

    if (!token) {
      this.loading = false;
      this.errorMsg = 'Token de verificación no encontrado';
      this.cdr.detectChanges();  // ✅ FORZAR DETECCIÓN
      return;
    }

    console.log('🔵 Verificando token:', token);

    this.http.post(`${environment.apiBase}/api/auth/verify-email`, { token })
      .subscribe({
        next: (response: any) => {
          console.log('✅ Respuesta exitosa:', response);
          console.log('🔄 Actualizando estado...');
          
          this.loading = false;
          this.success = true;
          
          console.log('📊 Estado actual - loading:', this.loading, 'success:', this.success);
          
          this.cdr.detectChanges();  // ✅ FORZAR DETECCIÓN DE CAMBIOS
          
          console.log('✅ UI actualizada');
        },
        error: (error: any) => {
          console.error('❌ Error en verificación:', error);
          
          this.loading = false;
          
          if (error.status === 400) {
            this.errorMsg = 'El enlace de verificación es inválido o ya fue usado';
          } else if (error.status === 0) {
            this.errorMsg = 'No se pudo conectar con el servidor';
          } else {
            this.errorMsg = error.error?.detail || 'Error al verificar el email';
          }
          
          this.cdr.detectChanges();  // ✅ FORZAR DETECCIÓN DE CAMBIOS
        }
      });
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}