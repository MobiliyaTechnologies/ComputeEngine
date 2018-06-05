import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AggregatorComponent } from './aggregator.component';

describe('AggregatorComponent', () => {
  let component: AggregatorComponent;
  let fixture: ComponentFixture<AggregatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AggregatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AggregatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
