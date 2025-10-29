// ============================================
// login-modal.component.ts - ACTUALIZADO
// ============================================
import {
  AfterViewInit, Component, EventEmitter, Input, OnChanges,
  Output, SimpleChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.css']
})
export class LoginModalComponent implements AfterViewInit, OnChanges {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<any>();
  @Output() goRegister = new EventEmitter<void>();

  hide = true;
  loading = false;
  errorMsg = '';

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngAfterViewInit() { this.toggleBodyScroll(this.open); }
  ngOnChanges(ch: SimpleChanges) {
    if (ch['open']) this.toggleBodyScroll(!!ch['open'].currentValue);
  }

  private toggleBodyScroll(lock: boolean) {
    try { document.body.style.overflow = lock ? 'hidden' : ''; } catch {}
  }

  // ✅ MÉTODO ACTUALIZADO - USA loginNative
  async submit() {
    if (this.loading) return;

    this.errorMsg = '';
    this.form.markAllAsTouched();
    
    if (this.form.invalid) {
      this.errorMsg = 'Revisa los campos marcados.';
      return;
    }

    const { email, password } = this.form.value as { email: string; password: string };
    this.loading = true;

    try {
      // ✅ Llama al método NATIVO (no Firebase)
      const usuario = await this.auth.loginNative(email, password);
      
      console.log('✅ Login exitoso:', usuario);
      this.success.emit({ user: usuario });
      this.close.emit();
      this.form.reset();
      
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      
      if (error.status === 401) {
        this.errorMsg = 'Credenciales inválidas';
      } else if (error.status === 0) {
        this.errorMsg = '⚠️ No se puede conectar al servidor';
      } else {
        this.errorMsg = error.error?.detail || 'Error al iniciar sesión';
      }
    } finally {
      this.loading = false;
    }
  }

  // ✅ LOGIN CON GOOGLE (usa Firebase + backend)
  async loginWithGoogle() {
    if (this.loading) return;
    
    this.errorMsg = '';
    this.loading = true;

    try {
      const result = await this.auth.loginGoogle();
      
      console.log('✅ Login con Google exitoso');
      this.success.emit({ user: result.user });
      this.close.emit();
      
    } catch (error: any) {
      console.error('❌ Error en Google login:', error);
      this.errorMsg = 'No se pudo iniciar con Google';
    } finally {
      this.loading = false;
    }
  }
}