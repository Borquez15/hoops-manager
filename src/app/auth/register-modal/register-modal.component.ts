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
    const { nombre, apP, apM, email } = this.form.value;
    const password = this.gp.get('password')!.value as string;

    try {
      // 1) crea usuario en Firebase
      const cred = await this.auth.register(
        `${nombre} ${apP}`.trim(),
        apP!, apM || '', email!, password
      );

      // 2) idToken para guardar en tu backend
      const idToken = await this.auth.getIdToken(cred.user);
      if (idToken) {
        await this.auth.exchangeWithBackend(idToken);
      }

      // 3) envía email de verificación (opción cliente)
      await this.auth.sendVerificationEmail();

      this.success.emit(cred.user);
      this.close.emit();
    } catch (e: any) {
      this.errorMsg = 'No pudimos crear tu cuenta. ' + (e?.message ?? '');
    } finally {
      this.sending = false;
    }
  }
}
