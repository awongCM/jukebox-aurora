import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GooglePlayMusicAPIService {
  private readonly http = inject(HttpClient);

  readonly stateKey = 'google_music_access_token';

  private accessToken: string | null = null;

  private get apiBaseUrl(): string {
    return environment.googleMusicApi.baseUrl;
  }

  checkValidAuthorization(): void {
    const storedAccessToken = localStorage.getItem(this.stateKey);
    if (!storedAccessToken) {
      console.log('Authentication Error Detected.');
      return;
    }
    console.log('Authentication Successful!');
    this.accessToken = storedAccessToken;
  }

  isTokenValid(): boolean {
    return this.accessToken !== null;
  }

  requestAuthorization(): void {
    this.http
      .post<GoogleLoginResponse>(`${this.apiBaseUrl}/login`, {})
      .pipe(
        tap((data) => {
          console.log('Google Authorization Tokens', data);
          localStorage.setItem(this.stateKey, data.accessToken);
          window.location.reload();
        }),
      )
      .subscribe();
  }

  endAuthorizationRequest(): void {
    localStorage.removeItem(this.stateKey);
    this.accessToken = null;
  }

  getData<T>(apiUrl: string): Observable<T> {
    return this.http.get<T>(apiUrl);
  }

  getUserTracks(): Observable<GoogleSongsResponse> {
    return this.getData<GoogleSongsResponse>(`${this.apiBaseUrl}/songs/`);
  }

  getStreamUrl(id: string): Observable<GoogleStreamResponse> {
    return this.getData<GoogleStreamResponse>(`${this.apiBaseUrl}/songs/${id}`);
  }
}

interface GoogleLoginResponse {
  accessToken: string;
}

interface GoogleSongsResponse {
  songs: {
    id: string;
    title: string;
    album: string;
    artist: string;
    albumArtRef: { url: string }[];
    stream_url?: string;
  }[];
}

interface GoogleStreamResponse {
  stream_url: string;
}
