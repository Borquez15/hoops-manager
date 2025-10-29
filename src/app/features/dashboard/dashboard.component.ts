import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-8"><h1>Dashboard</h1></div>`
})
export class DashboardComponent {}