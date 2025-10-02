import { TestBed } from '@angular/core/testing';

import { Jugadores } from './jugadores';

describe('Jugadores', () => {
  let service: Jugadores;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Jugadores);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
