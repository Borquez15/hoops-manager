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

  // ✅ inyecta sin constructor
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<any>();
  @Output() goRegister = new EventEmitter<void>()

  hide = true;
  errorMsg = '';

  // ✅ ya puedes usar fb aquí sin error
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

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.errorMsg = '';
    const { email, password } = this.form.value;

    try {
      const cred    = await this.auth.loginEmail(email!, password!);
      const idToken = await this.auth.getIdToken(cred.user);
      // opcional: await this.auth.exchangeWithBackend(idToken!);
      this.success.emit({ user: cred.user, idToken });
      this.close.emit();
    } catch {
      this.errorMsg = 'Credenciales inválidas.';
    }
  }

  async loginWithGoogle() {
    this.errorMsg = '';
    try {
      const cred    = await this.auth.loginGoogle();
      const idToken = await this.auth.getIdToken(cred.user);
      // opcional: await this.auth.exchangeWithBackend(idToken!);
      this.success.emit({ user: cred.user, idToken });
      this.close.emit();
    } catch {
      this.errorMsg = 'No se pudo iniciar con Google.';
    }
  }
}
