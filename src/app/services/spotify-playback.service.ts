import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SpotifyAPIService } from './spotify-api.service';

@Injectable({ providedIn: 'root' })
export class SpotifyPlaybackService {
  private readonly spotifyAPI = inject(SpotifyAPIService);

  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private connected = false;
  private sdkReady = false;
  private isPlaying = false;

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
    if (this.player || !this.sdkReady) {
      return;
    }

    this.player = new Spotify.Player({
      name: 'Jukebox Aurora',
      volume: 0.8,
      getOAuthToken: (callback) => {
        void firstValueFrom(this.spotifyAPI.ensureValidToken())
          .then((token) => callback(token))
          .catch((err: unknown) => {
            console.error('Spotify playback token refresh failed', err);
          });
      },
    });

    this.player.addListener('ready', ({ device_id }) => {
      this.deviceId = device_id;
      this.connected = true;
      console.log('Spotify Web Playback SDK connected:', device_id);
    });

    this.player.addListener('not_ready', ({ device_id }) => {
      this.connected = false;
      console.warn('Spotify Web Playback SDK not ready:', device_id);
    });

    this.player.addListener('player_state_changed', (state) => {
      this.isPlaying = state !== null && !state.paused;
    });

    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify playback initialization error:', message);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify playback authentication error:', message);
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('Spotify Premium required for full playback:', message);
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('Spotify playback error:', message);
    });

    void this.player.connect();
  }

  async playTrack(trackId: string): Promise<boolean> {
    if (!this.player || !this.deviceId) {
      return false;
    }

    try {
      await firstValueFrom(
        this.spotifyAPI.playTrackOnDevice(this.deviceId, `spotify:track:${trackId}`),
      );
      this.isPlaying = true;
      return true;
    } catch (err) {
      console.error('Failed to start Spotify playback', err);
      return false;
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
    this.isPlaying = false;
  }

  async resume(): Promise<void> {
    if (!this.player) {
      return;
    }

    await this.player.resume();
    this.isPlaying = true;
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
    this.deviceId = null;
    this.connected = false;
    this.isPlaying = false;
  }
}
