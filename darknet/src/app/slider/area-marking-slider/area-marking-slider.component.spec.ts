import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaMarkingSliderComponent } from './area-marking-slider.component';

describe('AreaMarkingSliderComponent', () => {
  let component: AreaMarkingSliderComponent;
  let fixture: ComponentFixture<AreaMarkingSliderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AreaMarkingSliderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AreaMarkingSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
