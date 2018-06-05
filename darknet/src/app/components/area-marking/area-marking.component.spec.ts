import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaMarkingComponent } from './area-marking.component';

describe('AreaMarkingComponent', () => {
  let component: AreaMarkingComponent;
  let fixture: ComponentFixture<AreaMarkingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AreaMarkingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AreaMarkingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
