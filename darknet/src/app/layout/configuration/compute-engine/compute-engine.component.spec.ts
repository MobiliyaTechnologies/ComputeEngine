import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ComputeEngineComponent } from './compute-engine.component';

describe('ComputeEngineComponent', () => {
  let component: ComputeEngineComponent;
  let fixture: ComponentFixture<ComputeEngineComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ComputeEngineComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComputeEngineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
