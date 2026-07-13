import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyAPIService } from './services/spotify-api.service';
import { GooglePlayMusicAPIService } from './services/gp-music-api.service';
import { Track } from './services/jukebox-interface';
import { PlugnPlayWindow } from './browsers/window-interface';
import { ScriptService } from './services/script.service';

declare const window: PlugnPlayWindow;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  readonly spotifyAPI = inject(SpotifyAPIService);
  readonly gmusicAPI = inject(GooglePlayMusicAPIService);
  private readonly scriptService = inject(ScriptService);

  title = 'Welcome to my JukeBox Aurora App';
  tracks: Track[] = [];

  selected_radio_api_service: string | null = null;
  radio_api_service_state_key = 'selected_api_service';

  selected_track: Track | null = null;
  isPlaying = false;
  audio: HTMLAudioElement | null = null;
  disc: HTMLElement | null = null;
  private loadedStreamUrl = '';

  readonly THRESHOLD = 0.6;
  readonly DEFAULT_SPEED = 7;
  readonly LEFT = 'left';
  readonly RIGHT = 'right';

  private scrolling: ReturnType<typeof setInterval> | undefined;
  private pageX = 0;
  private screenWidth = 0;
  private currentPosPercentage = 0;

  constructor() {
    console.log('Hello Jukebox Aurora App initialised');

    this.scriptService.loadScript('spotifysdk').then(() => {
      this.initiateWebPlayback();
    });
  }

  private initiateWebPlayback(): void {
    window.onSpotifyWebPlaybackSDKReady = () => {
      // Phase 2: wire up Spotify Web Playback SDK with PKCE-backed tokens.
      console.log('Spotify Web Playback SDK ready');
    };
  }

  ngOnInit(): void {
    this.selected_radio_api_service = localStorage.getItem(this.radio_api_service_state_key);
    this.refreshTitle();

    if (this.selected_radio_api_service === 'SPM') {
      this.spotifyAPI.initializeAuth().subscribe((result) => {
        if (result.authenticated) {
          this.loadSpotifyTracks();
        } else if (result.error) {
          alert(this.spotifyAuthErrorMessage(result.error));
        }
      });
    } else if (this.selected_radio_api_service === 'GPM') {
      this.gmusicAPI.checkValidAuthorization();
      if (this.hasValidToken()) {
        this.loadGooglePlayTracks();
      }
    }
  }

  private spotifyAuthErrorMessage(error: string): string {
    if (error === 'access_denied') {
      return 'Spotify login was cancelled. Please try again if you want to connect your library.';
    }
    if (error === 'token_exchange_failed') {
      return 'Spotify login failed during token exchange. Please try again.';
    }
    return `Spotify login failed (${error}). Please try again.`;
  }

  private loadGooglePlayTracks(): void {
    this.gmusicAPI.getUserTracks().subscribe({
      next: (data) => {
        this.tracks = data.songs.map((song) => ({
          album_artwork: song.albumArtRef[0]?.url ?? '',
          id: song.id,
          title: song.title,
          album: song.album,
          artist: song.artist,
          stream_url: song.stream_url ?? '',
        }));
      },
      error: () => {
        alert('Failed to load your Google Play library. Is the local proxy server running?');
      },
    });
  }

  private refreshTitle(): void {
    if (this.selected_radio_api_service === 'SPM') {
      this.title = 'Spotify Music Collection';
    } else if (this.selected_radio_api_service === 'GPM') {
      this.title = 'Google Play Collection';
    }
  }

  login(): void {
    if (!this.selected_radio_api_service) {
      alert('Please select Spotify or Google Play before logging in.');
      return;
    }

    if (this.selected_radio_api_service === 'SPM') {
      void this.spotifyAPI.requestAuthorization();
    } else {
      this.gmusicAPI.requestAuthorization();
    }
  }

  private loadSpotifyTracks(): void {
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
      },
      error: () => {
        alert('Failed to load your Spotify library. Try logging out and back in.');
      },
    });
  }

  logout(): void {
    if (this.selected_radio_api_service === 'SPM') {
      this.spotifyAPI.endAuthorizationRequest();
    } else {
      this.gmusicAPI.endAuthorizationRequest();
    }

    localStorage.removeItem(this.radio_api_service_state_key);
    window.location.reload();
  }

  toggle_radio_api_server(value: string): void {
    this.selected_radio_api_service = value;
    localStorage.setItem(this.radio_api_service_state_key, value);
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

    if (this.selected_radio_api_service === 'GPM') {
      this.gmusicAPI.getStreamUrl(this.selected_track.id).subscribe({
        next: (data) => {
          if (this.selected_track) {
            this.selected_track.stream_url = data.stream_url;
            this.syncAudioSource();
          }
        },
        error: () => {
          alert('Failed to load the stream URL for this track.');
        },
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

  hasValidToken(): boolean {
    if (this.selected_radio_api_service === 'SPM') {
      return this.spotifyAPI.isTokenValid();
    }
    return this.gmusicAPI.isTokenValid();
  }
}
