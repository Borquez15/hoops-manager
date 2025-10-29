// ============================================
// register-modal.component.ts - NUEVO
// ============================================
import {
  Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.css']
})
export class RegisterModalComponent implements OnChanges {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<any>();
  @Output() goLogin = new EventEmitter<void>();

  hide = true;
  loading = false;
  errorMsg = '';

  form = this.fb.group({
    nombre:    ['', [Validators.required, Validators.minLength(2)]],
    ap_p:      ['', [Validators.required, Validators.minLength(2)]],
    ap_m:      [''],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  ngOnChanges(ch: SimpleChanges) {
    if (ch['open']) {
      document.body.style.overflow = ch['open'].currentValue ? 'hidden' : '';
    }
  }

  async submit() {
    if (this.loading) return;

    this.errorMsg = '';
    this.form.markAllAsTouched();
    
    if (this.form.invalid) {
      this.errorMsg = 'Revisa los campos marcados.';
      return;
    }

    const { password, confirmPassword, ap_m, ...rest } = this.form.value;

    if (password !== confirmPassword) {
      this.errorMsg = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;

    try {
      const usuario = await this.auth.registerNative({
        ...rest as any,
        ap_m: ap_m || null,
        password: password!
      });
      
      console.log('✅ Registro exitoso:', usuario);
      this.success.emit({ user: usuario });
      this.close.emit();
      this.form.reset();
      
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      
      if (error.status === 409) {
        this.errorMsg = 'Este email ya está registrado';
      } else {
        this.errorMsg = error.error?.detail || 'Error al registrarse';
      }
    } finally {
      this.loading = false;
    }
  }

  async loginWithGoogle() {
    if (this.loading) return;
    
    this.errorMsg = '';
    this.loading = true;

    try {
      const result = await this.auth.loginGoogle();
      this.success.emit({ user: result.user });
      this.close.emit();
    } catch (error) {
      this.errorMsg = 'Error al registrarse con Google';
    } finally {
      this.loading = false;
    }
  }
}