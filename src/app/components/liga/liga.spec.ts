import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Liga } from './liga';

describe('Liga', () => {
  let component: Liga;
  let fixture: ComponentFixture<Liga>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Liga]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Liga);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
