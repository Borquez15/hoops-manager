import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

function samePassword(ctrl: AbstractControl): ValidationErrors | null {
  const p = ctrl.get('password')?.value;
  const c = ctrl.get('confirm')?.value;
  return p && c && p !== c ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.css'],
})
export class RegisterModalComponent {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<any>();          // devuelve user
  @Output() goLogin = new EventEmitter<void>();         // para saltar a login

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  hide = true; hide2 = true;
  errorMsg = '';
  sending = false;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(40)]],
    apP: ['', [Validators.required, Validators.maxLength(40)]],
    apM: ['', [Validators.maxLength(40)]],
    email: ['', [Validators.required, Validators.email]],
    groupPass: this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm:  ['', [Validators.required]],
    }, { validators: samePassword })
  });

  get f() { return this.form.controls; }
  get gp() { return (this.form.get('groupPass')!); }

  async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.sending = true;
  this.errorMsg = '';

  const nombre   = this.form.value.nombre!.trim();
  const email    = this.form.value.email!.trim().toLowerCase();
  const password = this.gp.get('password')!.value as string;
      try {
      const res = await this.auth.registerNative({ nombre, email, password });
      this.success.emit(res);
      this.close.emit();
    } catch (e: any) {
      // Si el backend manda {detail: 'Email ya registrado'} lo mostramos:
      this.errorMsg = e?.error?.detail || 'No pudimos crear tu cuenta.';
    } finally {
      this.sending = false;
    }
  }
}
