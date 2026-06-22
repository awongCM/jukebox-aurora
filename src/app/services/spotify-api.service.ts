import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SpotifyAPIService {
  private readonly http = inject(HttpClient);

  readonly redirectUri = environment.spotify.redirectUri;
  readonly stateKey = 'spotify_auth_state';

  private accessToken: string | null = null;
  private tokenType: string | null = null;

  private get clientId(): string {
    return environment.spotify.clientId;
  }

  checkValidAuthorization(): void {
    const hashParams = this.getHashParams();
    const { access_token, token_type, state } = hashParams;
    const storedState = localStorage.getItem(this.stateKey);

    if (access_token && (state == null || state !== storedState)) {
      alert('Authentication Error detected');
      return;
    }

    localStorage.removeItem(this.stateKey);
    if (access_token) {
      window.location.hash = '';
      this.accessToken = access_token;
      this.tokenType = token_type ?? 'Bearer';
    }
  }

  isTokenValid(): boolean {
    return this.accessToken !== null;
  }

  getHashParams(): Record<string, string> {
    const hashParams: Record<string, string> = {};
    const pattern = /([^&;=]+)=?([^&;]*)/g;
    const query = window.location.hash.substring(1);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(query)) !== null) {
      hashParams[match[1]] = decodeURIComponent(match[2]);
    }
    return hashParams;
  }

  requestAuthorization(): void {
    if (!this.clientId) {
      alert('Spotify client ID is not configured. See environment.example.ts.');
      return;
    }

    const stateValue = this.generateRandomString(16);
    localStorage.setItem(this.stateKey, stateValue);

    const queryParams = [
      '?response_type=token',
      `client_id=${encodeURIComponent(this.clientId)}`,
      'scope=user-library-read',
      `redirect_uri=${encodeURIComponent(this.redirectUri)}`,
      `state=${encodeURIComponent(stateValue)}`,
    ].join('&');

    window.location.href = `https://accounts.spotify.com/authorize${queryParams}`;
  }

  endAuthorizationRequest(): void {
    this.accessToken = null;
    this.tokenType = null;
  }

  getData<T>(apiUrl: string): Observable<T> {
    return this.http.get<T>(apiUrl, { headers: this.getHeaders() });
  }

  getUserTracks(): Observable<SpotifySavedTracksResponse> {
    return this.getData<SpotifySavedTracksResponse>('https://api.spotify.com/v1/me/tracks/');
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `${this.tokenType} ${this.accessToken}`,
    });
  }

  private generateRandomString(length: number): string {
    const combinations =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += combinations.charAt(Math.floor(Math.random() * combinations.length));
    }
    return result;
  }
}

export interface SpotifySavedTracksResponse {
  items: {
    track: {
      id: string;
      name: string;
      preview_url: string | null;
      track_number: number;
      album: {
        name: string;
        images: { url: string }[];
      };
      artists: { name: string }[];
    };
  }[];
}
