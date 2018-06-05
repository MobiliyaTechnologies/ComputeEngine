import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectCameraOnboardingComponent } from './connect-camera-onboarding.component';

describe('ConnectCameraOnboardingComponent', () => {
  let component: ConnectCameraOnboardingComponent;
  let fixture: ComponentFixture<ConnectCameraOnboardingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConnectCameraOnboardingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectCameraOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
