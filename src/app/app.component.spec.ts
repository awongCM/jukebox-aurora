import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { ScriptService } from './services/script.service';
import { SpotifyAPIService } from './services/spotify-api.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        {
          provide: ScriptService,
          useValue: { loadScript: () => Promise.resolve({ loaded: true }) },
        },
        {
          provide: SpotifyAPIService,
          useValue: {
            initializeAuth: () => of(false),
            isTokenValid: () => false,
            requestAuthorization: () => Promise.resolve(),
            endAuthorizationRequest: () => undefined,
            getUserTracks: () => of({ items: [] }),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have the default title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Welcome to my JukeBox Aurora App');
  });

  it('should render title in an h1 tag', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Welcome to my JukeBox Aurora App');
  });
});
