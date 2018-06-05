import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectCameraComponent } from './connect-camera.component';

describe('ConnectCameraComponent', () => {
  let component: ConnectCameraComponent;
  let fixture: ComponentFixture<ConnectCameraComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConnectCameraComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectCameraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
