import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { SpotifyAPIService } from './spotify-api.service';

export type SpotifyPlayResult = 'started' | 'queued' | 'failed';

@Injectable({ providedIn: 'root' })
export class SpotifyPlaybackService {
  private readonly spotifyAPI = inject(SpotifyAPIService);
  private readonly ngZone = inject(NgZone);

  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private connected = false;
  private sdkReady = false;
  private isPlaying = false;
  private pendingTrackId: string | null = null;
  private unavailable = false;

  readonly isPlaying$ = new BehaviorSubject<boolean>(false);
  readonly playbackUnavailable$ = new BehaviorSubject<boolean>(false);

  markSdkReady(): void {
    this.sdkReady = true;
  }

  isSdkReady(): boolean {
    return this.sdkReady;
  }

  isPlayerReady(): boolean {
    return this.connected && this.deviceId !== null;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  initializePlayer(): void {
    if (!this.sdkReady || this.unavailable) {
      return;
    }

    if (this.player && this.isPlayerReady()) {
      return;
    }

    if (this.player && !this.isPlayerReady()) {
      this.disconnect(false);
    }

    this.player = new Spotify.Player({
      name: 'Jukebox Aurora',
      volume: 0.8,
      getOAuthToken: (callback) => {
        void firstValueFrom(this.spotifyAPI.ensureValidToken())
          .then((token) => callback(token))
          .catch((err: unknown) => {
            console.error('Spotify playback token refresh failed', err);
            this.ngZone.run(() => this.markUnavailable());
          });
      },
    });

    this.player.addListener('ready', ({ device_id }) => {
      this.ngZone.run(() => {
        this.deviceId = device_id;
        this.connected = true;
        console.log('Spotify Web Playback SDK connected:', device_id);
        const pending = this.pendingTrackId;
        if (pending) {
          this.pendingTrackId = null;
          void this.playTrack(pending);
        }
      });
    });

    this.player.addListener('not_ready', ({ device_id }) => {
      this.ngZone.run(() => {
        this.connected = false;
        console.warn('Spotify Web Playback SDK not ready:', device_id);
      });
    });

    this.player.addListener('player_state_changed', (state) => {
      this.ngZone.run(() => {
        this.setPlaying(state !== null && !state.paused);
      });
    });

    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify playback initialization error:', message);
      this.ngZone.run(() => this.markUnavailable());
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify playback authentication error:', message);
      this.ngZone.run(() => this.markUnavailable());
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('Spotify Premium required for full playback:', message);
      this.ngZone.run(() => this.markUnavailable());
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('Spotify playback error:', message);
    });

    void this.player.connect();
  }

  async playTrack(trackId: string): Promise<SpotifyPlayResult> {
    if (this.unavailable) {
      return 'failed';
    }

    if (!this.player || !this.deviceId) {
      this.pendingTrackId = trackId;
      if (this.sdkReady) {
        this.initializePlayer();
        return 'queued';
      }
      return 'failed';
    }

    try {
      await this.player.activateElement();
      await firstValueFrom(
        this.spotifyAPI.playTrackOnDevice(this.deviceId, `spotify:track:${trackId}`),
      );
      this.setPlaying(true);
      return 'started';
    } catch (err) {
      console.error('Failed to start Spotify playback', err);
      return 'failed';
    }
  }

  async togglePlay(): Promise<void> {
    if (!this.player) {
      return;
    }

    await this.player.togglePlay();
  }

  async pause(): Promise<void> {
    if (!this.player) {
      return;
    }

    await this.player.pause();
    this.setPlaying(false);
  }

  async resume(): Promise<void> {
    if (!this.player) {
      return;
    }

    await this.player.resume();
    this.setPlaying(true);
  }

  disconnect(resetSdkReady = true): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
    this.deviceId = null;
    this.connected = false;
    this.pendingTrackId = null;
    this.unavailable = false;
    this.setPlaying(false);
    this.playbackUnavailable$.next(false);
    if (resetSdkReady) {
      this.sdkReady = false;
    }
  }

  private markUnavailable(): void {
    this.unavailable = true;
    this.pendingTrackId = null;
    this.playbackUnavailable$.next(true);
  }

  private setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.isPlaying$.next(playing);
  }
}
