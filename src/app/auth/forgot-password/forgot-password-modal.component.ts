// components/forgot-password-modal/forgot-password-modal.component.ts
import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password-modal.component.html',
  styleUrls: ['./forgot-password-modal.component.css']
})
export class ForgotPasswordModalComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  loading = false;
  success = false;
  errorMsg = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnChanges(ch: SimpleChanges) {
    if (ch['open']) {
      document.body.style.overflow = ch['open'].currentValue ? 'hidden' : '';
      
      // Resetear estado al cerrar
      if (!ch['open'].currentValue) {
        this.success = false;
        this.errorMsg = '';
        this.form.reset();
      }
    }
  }

  async submit() {
    if (this.loading || this.form.invalid) return;

    this.errorMsg = '';
    this.loading = true;

    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBase}/api/auth/forgot-password`, {
          email: this.form.value.email
        })
      );

      console.log('✅ Email de recuperación enviado');
      this.success = true;
      this.form.reset();

    } catch (error: any) {
      console.error('❌ Error:', error);
      this.errorMsg = 'Error al enviar email. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }
}