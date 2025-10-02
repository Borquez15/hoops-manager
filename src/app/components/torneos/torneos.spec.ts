import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Torneos } from './torneos';

describe('Torneos', () => {
  let component: Torneos;
  let fixture: ComponentFixture<Torneos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Torneos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Torneos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
