import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraMappingComponent } from './camera-mapping.component';

describe('CameraMappingComponent', () => {
  let component: CameraMappingComponent;
  let fixture: ComponentFixture<CameraMappingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CameraMappingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CameraMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
