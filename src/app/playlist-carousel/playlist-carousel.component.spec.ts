import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaylistCarouselComponent } from './playlist-carousel.component';

describe('PlaylistCarouselComponent', () => {
  let component: PlaylistCarouselComponent;
  let fixture: ComponentFixture<PlaylistCarouselComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlaylistCarouselComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlaylistCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
