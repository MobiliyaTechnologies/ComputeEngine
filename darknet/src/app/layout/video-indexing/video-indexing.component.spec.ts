import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoIndexingComponent } from './video-indexing.component';

describe('VideoIndexingComponent', () => {
  let component: VideoIndexingComponent;
  let fixture: ComponentFixture<VideoIndexingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VideoIndexingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoIndexingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
