import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarsliderComponent } from './navbarslider.component';

describe('NavbarsliderComponent', () => {
  let component: NavbarsliderComponent;
  let fixture: ComponentFixture<NavbarsliderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NavbarsliderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NavbarsliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
