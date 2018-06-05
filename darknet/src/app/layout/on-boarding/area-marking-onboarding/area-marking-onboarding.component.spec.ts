import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaMarkingOnboardingComponent } from './area-marking-onboarding.component';

describe('AreaMarkingOnboardingComponent', () => {
  let component: AreaMarkingOnboardingComponent;
  let fixture: ComponentFixture<AreaMarkingOnboardingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AreaMarkingOnboardingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AreaMarkingOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
