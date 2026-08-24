import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SpotifyAPIService } from './services/spotify-api.service';
import { SpotifyPlaybackService } from './services/spotify-playback.service';
import { ItunesMusicSearchAPIService } from './services/itunes-music-api.service';
import { Track } from './services/jukebox-interface';
import { ScriptService } from './services/script.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  readonly spotifyAPI = inject(SpotifyAPIService);
  readonly spotifyPlayback = inject(SpotifyPlaybackService);
  readonly itunesAPI = inject(ItunesMusicSearchAPIService);
  private readonly scriptService = inject(ScriptService);

  title = 'Welcome to my JukeBox Aurora App';
  tracks: Track[] = [];
  libraryLoading = false;

  selected_radio_api_service: string | null = null;
  radio_api_service_state_key = 'selected_api_service';

  selected_track: Track | null = null;
  isPlaying = false;
  audio: HTMLAudioElement | null = null;
  disc: HTMLElement | null = null;
  private loadedStreamUrl = '';
  useSpotifyPlayback = false;

  readonly THRESHOLD = 0.6;
  readonly DEFAULT_SPEED = 7;
  readonly LEFT = 'left';
  readonly RIGHT = 'right';

  private scrolling: ReturnType<typeof setInterval> | undefined;
  private pageX = 0;
  private screenWidth = 0;
  private currentPosPercentage = 0;
  private readonly subscriptions = new Subscription();

  constructor() {
    console.log('Hello Jukebox Aurora App initialised');
  }

  ngOnInit(): void {
    this.selected_radio_api_service = localStorage.getItem(this.radio_api_service_state_key);
    this.migrateLegacyProviderSelection();
    this.refreshTitle();

    this.subscriptions.add(
      this.spotifyPlayback.isPlaying$.subscribe((playing) => {
        if (this.useSpotifyPlayback) {
          this.isPlaying = playing;
        }
      }),
    );

    this.subscriptions.add(
      this.spotifyPlayback.playbackUnavailable$.subscribe((unavailable) => {
        if (unavailable && this.useSpotifyPlayback) {
          this.useSpotifyPlayback = false;
          this.isPlaying = false;
        }
      }),
    );

    if (this.selected_radio_api_service === 'SPM') {
      this.spotifyAPI.initializeAuth().subscribe((result) => {
        if (result.authenticated) {
          this.prepareSpotifyPlayback();
          this.loadSpotifyTracks();
        } else if (result.error) {
          alert(this.spotifyAuthErrorMessage(result.error));
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.endScroll();
  }

  private migrateLegacyProviderSelection(): void {
    if (this.selected_radio_api_service === 'GPM') {
      this.selected_radio_api_service = 'ITM';
      localStorage.setItem(this.radio_api_service_state_key, 'ITM');
    }
  }

  private prepareSpotifyPlayback(): void {
    void this.scriptService.loadScript('spotifysdk').then(() => {
      this.spotifyPlayback.markSdkReady();
      window.onSpotifyWebPlaybackSDKReady = () => {
        this.spotifyPlayback.initializePlayer();
      };

      if (typeof Spotify !== 'undefined') {
        window.onSpotifyWebPlaybackSDKReady();
      }
    });
  }

  private spotifyAuthErrorMessage(error: string): string {
    if (error === 'access_denied') {
      return 'Spotify login was cancelled. Please try again if you want to connect your library.';
    }
    if (error === 'token_exchange_failed') {
      return 'Spotify login failed during token exchange. Please try again.';
    }
    if (error === 'token_refresh_failed') {
      return 'Spotify session expired. Please log in again.';
    }
    return `Spotify login failed (${error}). Please try again.`;
  }

  private refreshTitle(): void {
    if (this.selected_radio_api_service === 'SPM') {
      this.title = 'Spotify Music Collection';
    } else if (this.selected_radio_api_service === 'ITM') {
      this.title = 'iTunes Music Search';
    } else {
      this.title = 'Welcome to my JukeBox Aurora App';
    }
  }

  login(): void {
    if (this.selected_radio_api_service !== 'SPM') {
      alert('Please select Spotify before logging in.');
      return;
    }

    void this.spotifyAPI.requestAuthorization();
  }

  searchItunes(term: string): void {
    const trimmed = term.trim();
    if (!trimmed) {
      alert('Enter a search term to find music on iTunes.');
      return;
    }

    this.itunesAPI.searchTracks(trimmed).subscribe({
      next: (tracks) => {
        this.tracks = tracks;
        if (tracks.length === 0) {
          alert('No tracks found. Try a different search term.');
        }
      },
      error: () => {
        alert('Failed to search iTunes. Please try again.');
      },
    });
  }

  onItunesSearch(event: Event, term: string): void {
    event.preventDefault();
    this.searchItunes(term);
  }

  private loadSpotifyTracks(): void {
    this.libraryLoading = true;
    this.spotifyAPI.getUserTracks().subscribe({
      next: (data) => {
        this.tracks = data.items.flatMap((item) => {
          if (!item.track) {
            return [];
          }

          return [{
            album_artwork: item.track.album.images[1]?.url ?? item.track.album.images[0]?.url ?? '',
            id: item.track.id,
            title: item.track.name,
            album: item.track.album.name,
            artist: item.track.artists[0]?.name ?? 'Unknown artist',
            stream_url: item.track.preview_url ?? '',
          }];
        });
        this.libraryLoading = false;
      },
      error: () => {
        this.libraryLoading = false;
        alert('Failed to load your Spotify library. Try logging out and back in.');
      },
    });
  }

  logout(): void {
    if (this.selected_radio_api_service === 'SPM') {
      this.spotifyAPI.endAuthorizationRequest();
      this.spotifyPlayback.disconnect();
    }

    this.tracks = [];
    this.selected_track = null;
    this.isPlaying = false;
    this.useSpotifyPlayback = false;
    localStorage.removeItem(this.radio_api_service_state_key);
    window.location.reload();
  }

  toggle_radio_api_server(value: string): void {
    this.selected_radio_api_service = value;
    localStorage.setItem(this.radio_api_service_state_key, value);
    this.refreshTitle();
  }

  toggle(): void {
    document.getElementById('gallery')?.classList.toggle('js-expanded');
  }

  fullscreen(): void {
    const fullScreen = document.getElementById('fullscreen');
    if (!fullScreen) {
      return;
    }

    const element = fullScreen as HTMLElement & {
      mozRequestFullScreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };

    if (element.requestFullscreen) {
      void element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      void element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      void element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      void element.msRequestFullscreen();
    }
  }

  track_select(track: Track): void {
    this.selected_track = track;
    this.isPlaying = false;
    this.resetAudioPlayer();
    this.useSpotifyPlayback = false;

    if (this.selected_radio_api_service === 'SPM') {
      void this.spotifyPlayback.playTrack(track.id).then((result) => {
        this.useSpotifyPlayback = result === 'started' || result === 'queued';
        if (result === 'started') {
          this.isPlaying = true;
        }
      });
    }

    this.disc = document.getElementById('disc');
    if (this.disc) {
      this.disc.style.animation = 'none';
      setTimeout(() => {
        if (this.disc) {
          this.disc.style.animation = '';
        }
      }, 10);
    }
  }

  display_album_artwork(): string {
    return this.display_template_data('album_artwork', 'https://via.placeholder.com/250x250');
  }

  display_track_title(): string {
    return this.display_template_data('title', 'No audio track is chosen');
  }

  display_album_url(): string {
    return this.display_template_data('stream_url', '');
  }

  private display_template_data(dataProp: keyof Track, defaultValue: string): string {
    if (this.selected_track !== null && this.selected_track[dataProp]) {
      return String(this.selected_track[dataProp]);
    }
    return defaultValue;
  }

  pause_play_track(event: Event): void {
    event.preventDefault();

    if (this.useSpotifyPlayback && this.spotifyPlayback.isPlayerReady()) {
      void this.spotifyPlayback.togglePlay();
      return;
    }

    this.isPlaying = !this.isPlaying;

    this.audio = document.getElementById('player_audio') as HTMLAudioElement | null;
    if (!this.audio) {
      return;
    }

    this.syncAudioSource();

    if (this.isPlaying) {
      void this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  private resetAudioPlayer(): void {
    if (this.audio) {
      this.audio.pause();
    }
    this.audio = null;
    this.loadedStreamUrl = '';
  }

  private syncAudioSource(): void {
    if (!this.audio) {
      return;
    }

    const streamUrl = this.display_album_url();
    if (!streamUrl || this.loadedStreamUrl === streamUrl) {
      return;
    }

    this.loadedStreamUrl = streamUrl;
    this.audio.src = streamUrl;
    this.audio.load();
  }

  pause_play_state(): string {
    return this.isPlaying ? 'running' : 'paused';
  }

  reset_play_state(): void {
    this.isPlaying = false;
    if (this.useSpotifyPlayback) {
      void this.spotifyPlayback.pause();
    }
  }

  scroll_tracks(event: MouseEvent): void {
    this.pageX = event.clientX;
    this.screenWidth = window.innerWidth;
    this.currentPosPercentage = (this.screenWidth - this.pageX) / this.screenWidth;

    const gallery = document.getElementById('gallery');
    if (!gallery) {
      return;
    }

    if (this.currentPosPercentage > this.THRESHOLD) {
      this.setScroll(this.LEFT, this.DEFAULT_SPEED, gallery);
    } else if (this.currentPosPercentage < 1 - this.THRESHOLD) {
      this.setScroll(this.RIGHT, this.DEFAULT_SPEED, gallery);
    } else {
      this.endScroll();
    }
  }

  private setScroll(direction: string, speed: number, gallery: HTMLElement): void {
    this.endScroll();
    this.scrolling = setInterval(() => {
      const newPos = direction === this.LEFT ? -1 * speed : speed;
      gallery.scrollLeft += newPos;
    }, 10);
  }

  private endScroll(): void {
    if (this.scrolling !== undefined) {
      clearInterval(this.scrolling);
      this.scrolling = undefined;
    }
  }

  isSpotifyAuthenticated(): boolean {
    return this.selected_radio_api_service === 'SPM' && this.spotifyAPI.hasSession();
  }

  isItunesSelected(): boolean {
    return this.selected_radio_api_service === 'ITM';
  }

  hasItunesResults(): boolean {
    return this.isItunesSelected() && this.tracks.length > 0;
  }

  /** Template compatibility: Spotify session or iTunes search results. */
  hasValidToken(): boolean {
    return this.isSpotifyAuthenticated() || this.hasItunesResults();
  }
}
