import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ComputeManagementComponent } from './compute-management.component';

describe('ComputeManagementComponent', () => {
  let component: ComputeManagementComponent;
  let fixture: ComponentFixture<ComputeManagementComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ComputeManagementComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComputeManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
