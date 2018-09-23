import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { JukeboxPlayerComponent } from './jukebox-player.component';

describe('JukeboxPlayerComponent', () => {
  let component: JukeboxPlayerComponent;
  let fixture: ComponentFixture<JukeboxPlayerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ JukeboxPlayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JukeboxPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
