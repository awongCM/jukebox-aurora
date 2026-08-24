import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { AppComponent } from './app.component';
import { ScriptService } from './services/script.service';
import { SpotifyAPIService } from './services/spotify-api.service';
import { SpotifyPlaybackService } from './services/spotify-playback.service';
import { ItunesMusicSearchAPIService } from './services/itunes-music-api.service';
import { Track } from './services/jukebox-interface';

describe('AppComponent', () => {
  let itunesSearch: jasmine.Spy;
  let spotifyHasSession: jasmine.Spy;

  beforeEach(async () => {
    itunesSearch = jasmine.createSpy('searchTracks').and.returnValue(of([]));
    spotifyHasSession = jasmine.createSpy('hasSession').and.returnValue(false);

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
            initializeAuth: () => of({ authenticated: false }),
            isTokenValid: () => false,
            hasSession: spotifyHasSession,
            requestAuthorization: () => Promise.resolve(),
            endAuthorizationRequest: () => undefined,
            getUserTracks: () => of({ items: [] }),
          },
        },
        {
          provide: SpotifyPlaybackService,
          useValue: {
            markSdkReady: () => undefined,
            initializePlayer: () => undefined,
            isPlayerReady: () => false,
            getIsPlaying: () => false,
            playTrack: () => Promise.resolve('failed'),
            togglePlay: () => Promise.resolve(),
            pause: () => Promise.resolve(),
            disconnect: () => undefined,
            isPlaying$: new BehaviorSubject(false),
            playbackUnavailable$: new BehaviorSubject(false),
          },
        },
        {
          provide: ItunesMusicSearchAPIService,
          useValue: {
            searchTracks: itunesSearch,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
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

  it('migrates a stored Google Play selection to iTunes', () => {
    localStorage.setItem('selected_api_service', 'GPM');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    expect(app.selected_radio_api_service).toBe('ITM');
    expect(localStorage.getItem('selected_api_service')).toBe('ITM');
    expect(app.title).toBe('iTunes Music Search');
  });

  it('keeps the iTunes search form after a successful search', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.toggle_radio_api_server('ITM');
    const tracks: Track[] = [{
      id: '1',
      title: 'Runaway',
      album: 'A Different Kind of Human',
      artist: 'AURORA',
      album_artwork: 'https://example.com/art.jpg',
      stream_url: 'https://example.com/preview.m4a',
    }];
    itunesSearch.and.returnValue(of(tracks));
    app.searchItunes('aurora');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.itunes-search')).not.toBeNull();
    expect(compiled.querySelector('#fullscreen')).not.toBeNull();
  });
});
