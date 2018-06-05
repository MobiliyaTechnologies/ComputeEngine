import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraMappingSliderComponent } from './camera-mapping-slider.component';

describe('CameraMappingSliderComponent', () => {
  let component: CameraMappingSliderComponent;
  let fixture: ComponentFixture<CameraMappingSliderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CameraMappingSliderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CameraMappingSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
