import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Caracteristicas } from './caracteristicas';

describe('Caracteristicas', () => {
  let component: Caracteristicas;
  let fixture: ComponentFixture<Caracteristicas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Caracteristicas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Caracteristicas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
