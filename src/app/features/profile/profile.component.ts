// features/profile/profile.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface UserProfile {
  id_usuario: number;
  nombre: string;
  ap_p: string;
  ap_m: string | null;
  email: string;
  activo: boolean;
  email_verified: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule], // ✅ CommonModule incluye NgIf
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);

  private apiUrl = 'http://localhost:8000';

  user: UserProfile | null = null;
  loading = true;
  saving = false;
  error = '';
  successMessage = '';

  profileForm: FormGroup;
  passwordForm: FormGroup;

  activeTab: 'profile' | 'password' | 'security' = 'profile';

  constructor() {
    this.profileForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      ap_p: ['', [Validators.required, Validators.minLength(2)]],
      ap_m: [''],
      email: ['', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const userData = this.auth.getCurrentUserNative();
    
    if (!userData) {
      this.router.navigate(['/']);
      return;
    }

    this.user = userData;
    
    this.profileForm.patchValue({
      nombre: userData.nombre,
      ap_p: userData.ap_p,
      ap_m: userData.ap_m || '',
      email: userData.email
    });

    this.loading = false;
  }

  setActiveTab(tab: 'profile' | 'password' | 'security') {
    this.activeTab = tab;
    this.error = '';
    this.successMessage = '';
  }

  async saveProfile() {
    if (this.profileForm.invalid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.saving = true;
    this.error = '';
    this.successMessage = '';

    const token = localStorage.getItem('auth_token');

    try {
      const response: any = await this.http.put(
        `${this.apiUrl}/api/users/me`,
        this.profileForm.value,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      ).toPromise();

      // Actualizar localStorage
      const updatedUser = { ...this.user, ...this.profileForm.value };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      this.user = updatedUser as UserProfile;

      this.successMessage = '✅ Perfil actualizado exitosamente';
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      this.error = error.error?.detail || 'Error al actualizar el perfil';
    } finally {
      this.saving = false;
    }
  }

  async changePassword() {
    if (this.passwordForm.invalid) {
      this.error = 'Por favor completa todos los campos';
      return;
    }

    const { newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.saving = true;
    this.error = '';
    this.successMessage = '';

    const token = localStorage.getItem('auth_token');

    try {
      await this.http.post(
        `${this.apiUrl}/api/users/change-password`,
        {
          current_password: this.passwordForm.value.currentPassword,
          new_password: newPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      ).toPromise();

      this.successMessage = '✅ Contraseña actualizada exitosamente';
      this.passwordForm.reset();

      setTimeout(() => {
        this.successMessage = '';
      }, 3000);

    } catch (error: any) {
      console.error('Error changing password:', error);
      this.error = error.error?.detail || 'Error al cambiar la contraseña';
    } finally {
      this.saving = false;
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  getUserInitial(): string {
    return this.user?.nombre?.charAt(0).toUpperCase() || 'U';
  }
}