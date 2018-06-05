import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AggregatorManagementComponent } from './aggregator-management.component';

describe('AggregatorManagementComponent', () => {
  let component: AggregatorManagementComponent;
  let fixture: ComponentFixture<AggregatorManagementComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AggregatorManagementComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AggregatorManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
