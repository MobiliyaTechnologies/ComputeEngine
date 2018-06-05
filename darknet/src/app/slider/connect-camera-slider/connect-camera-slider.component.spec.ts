import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectCameraSliderComponent } from './connect-camera-slider.component';

describe('ConnectCameraSliderComponent', () => {
  let component: ConnectCameraSliderComponent;
  let fixture: ComponentFixture<ConnectCameraSliderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConnectCameraSliderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectCameraSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
