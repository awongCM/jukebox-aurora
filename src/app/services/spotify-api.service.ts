import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

@Injectable({ providedIn: 'root' })
export class SpotifyAPIService {
  private readonly http = inject(HttpClient);

  readonly redirectUri = environment.spotify.redirectUri;
  readonly stateKey = 'spotify_auth_state';
  private readonly codeVerifierKey = 'spotify_code_verifier';
  private readonly accessTokenKey = 'spotify_access_token';
  private readonly tokenTypeKey = 'spotify_token_type';
  private readonly refreshTokenKey = 'spotify_refresh_token';

  private accessToken: string | null = null;
  private tokenType: string | null = null;

  private get clientId(): string {
    return environment.spotify.clientId;
  }

  /**
   * Handles PKCE callback, restores a stored session, or returns false.
   */
  initializeAuth(): Observable<boolean> {
    this.restoreStoredToken();

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      console.error('Spotify authorization denied:', error);
      this.clearAuthQueryParams();
      return of(false);
    }

    const code = urlParams.get('code');
    if (!code) {
      return of(this.isTokenValid());
    }

    const state = urlParams.get('state');
    const storedState = localStorage.getItem(this.stateKey);
    if (!state || state !== storedState) {
      console.error('Spotify state mismatch — possible CSRF attempt');
      this.clearAuthQueryParams();
      return of(false);
    }

    const codeVerifier = sessionStorage.getItem(this.codeVerifierKey);
    if (!codeVerifier) {
      console.error('Spotify code verifier missing from session');
      this.clearAuthQueryParams();
      return of(false);
    }

    return this.exchangeCodeForToken(code, codeVerifier).pipe(
      tap(() => {
        localStorage.removeItem(this.stateKey);
        sessionStorage.removeItem(this.codeVerifierKey);
        this.clearAuthQueryParams();
      }),
      map(() => true),
      catchError((err) => {
        console.error('Spotify token exchange failed', err);
        return of(false);
      }),
    );
  }

  isTokenValid(): boolean {
    return this.accessToken !== null;
  }

  async requestAuthorization(): Promise<void> {
    if (!this.clientId) {
      alert('Spotify client ID is not configured. See environment.example.ts.');
      return;
    }

    const stateValue = this.generateRandomString(16);
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    localStorage.setItem(this.stateKey, stateValue);
    sessionStorage.setItem(this.codeVerifierKey, codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: 'user-library-read',
      redirect_uri: this.redirectUri,
      state: stateValue,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  endAuthorizationRequest(): void {
    this.accessToken = null;
    this.tokenType = null;
    sessionStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.tokenTypeKey);
    sessionStorage.removeItem(this.refreshTokenKey);
    sessionStorage.removeItem(this.codeVerifierKey);
    localStorage.removeItem(this.stateKey);
  }

  getData<T>(apiUrl: string): Observable<T> {
    return this.http.get<T>(apiUrl, { headers: this.getHeaders() });
  }

  getUserTracks(): Observable<SpotifySavedTracksResponse> {
    return this.getData<SpotifySavedTracksResponse>('https://api.spotify.com/v1/me/tracks/');
  }

  private exchangeCodeForToken(
    code: string,
    codeVerifier: string,
  ): Observable<SpotifyTokenResponse> {
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('code', code)
      .set('redirect_uri', this.redirectUri)
      .set('client_id', this.clientId)
      .set('code_verifier', codeVerifier);

    return this.http
      .post<SpotifyTokenResponse>('https://accounts.spotify.com/api/token', body.toString(), {
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      })
      .pipe(tap((response) => this.persistToken(response)));
  }

  private persistToken(response: SpotifyTokenResponse): void {
    this.accessToken = response.access_token;
    this.tokenType = response.token_type;
    sessionStorage.setItem(this.accessTokenKey, response.access_token);
    sessionStorage.setItem(this.tokenTypeKey, response.token_type);
    if (response.refresh_token) {
      sessionStorage.setItem(this.refreshTokenKey, response.refresh_token);
    }
  }

  private restoreStoredToken(): void {
    const token = sessionStorage.getItem(this.accessTokenKey);
    if (token) {
      this.accessToken = token;
      this.tokenType = sessionStorage.getItem(this.tokenTypeKey) ?? 'Bearer';
    }
  }

  private clearAuthQueryParams(): void {
    window.history.replaceState({}, document.title, window.location.pathname);
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

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  private base64UrlEncode(buffer: Uint8Array): string {
    const binary = Array.from(buffer, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
