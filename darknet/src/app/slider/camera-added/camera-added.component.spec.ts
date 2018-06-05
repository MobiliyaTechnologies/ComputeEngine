import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraAddedComponent } from './camera-added.component';

describe('CameraAddedComponent', () => {
  let component: CameraAddedComponent;
  let fixture: ComponentFixture<CameraAddedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CameraAddedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CameraAddedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
