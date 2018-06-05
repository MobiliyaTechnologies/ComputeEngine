import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotCameraComponent } from './plot-camera.component';

describe('PlotCameraComponent', () => {
  let component: PlotCameraComponent;
  let fixture: ComponentFixture<PlotCameraComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlotCameraComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlotCameraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
