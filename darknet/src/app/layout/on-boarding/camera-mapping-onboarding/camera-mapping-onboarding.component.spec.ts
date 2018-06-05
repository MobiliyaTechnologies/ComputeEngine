import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraMappingOnboardingComponent } from './camera-mapping-onboarding.component';

describe('CameraMappingOnboardingComponent', () => {
  let component: CameraMappingOnboardingComponent;
  let fixture: ComponentFixture<CameraMappingOnboardingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CameraMappingOnboardingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CameraMappingOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
