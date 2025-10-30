// src/app/app.spec.ts
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app'; // ← Cambia App a AppComponent

describe('AppComponent', () => { // ← Cambia 'App' a 'AppComponent'
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent], // ← Cambia App a AppComponent
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent); // ← Cambia App a AppComponent
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});