// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app'; // ← Cambia App a AppComponent

bootstrapApplication(AppComponent, appConfig) // ← Cambia App a AppComponent
  .catch((err) => console.error(err));