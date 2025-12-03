// register-modal.component.ts
import {
  Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges, ChangeDetectorRef
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

  private cdr = inject(ChangeDetectorRef);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<any>();
  @Output() goLogin = new EventEmitter<void>();

  hide = true;
  loading = false;
  errorMsg = '';
  successMsg = '';  // ✅ NUEVO

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
      
      // Resetear mensajes al abrir/cerrar
      if (!ch['open'].currentValue) {
        this.successMsg = '';
        this.errorMsg = '';
        this.form.reset();
      }
    }
  }

  async submit() {
    if (this.loading) return;

    this.errorMsg = '';
    this.successMsg = '';
    this.form.markAllAsTouched();
    
    if (this.form.invalid) {
      this.errorMsg = 'Revisa los campos marcados.';
      return;
    }

    const { password, confirmPassword, ap_m, ...rest } = this.form.value;

    if (password !== confirmPassword) {
      this.errorMsg = 'Las contraseñas no coinciden';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;

    try {
      const response = await this.auth.registerNative({
        ...rest as any,
        ap_m: ap_m || null,
        password: password!
      });
      
      console.log('✅ Registro exitoso:', response);
      
      // ✅ MOSTRAR MENSAJE DE ÉXITO
      this.successMsg = '✅ Cuenta creada exitosamente. Revisa tu email para verificar tu cuenta.';
      this.form.reset();
      
      // ✅ Cerrar modal y redirigir al login después de 4 segundos
      setTimeout(() => {
        this.close.emit();
        this.goLogin.emit();
      }, 4000);
      
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      
      if (error.status === 409) {
        this.errorMsg = 'Este email ya está registrado';
        this.cdr.detectChanges();
      } else {
        this.errorMsg = error.error?.detail || 'Error al registrarse';
        this.cdr.detectChanges();
      }
    } finally {
      this.cdr.detectChanges();
      this.loading = false;
    }
  }

  async loginWithGoogle() {
    if (this.loading) return;
    
    this.errorMsg = '';
    this.successMsg = '';
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