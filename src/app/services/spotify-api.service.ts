import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, expand, finalize, map, reduce, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/** Scopes required for library access and Web Playback SDK streaming. */
export const SPOTIFY_SCOPES = [
  'user-library-read',
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

/** Refresh access tokens one minute before they expire. */
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class SpotifyAPIService {
  private readonly http = inject(HttpClient);

  readonly redirectUri = environment.spotify.redirectUri;
  readonly stateKey = 'spotify_auth_state';
  private readonly codeVerifierKey = 'spotify_code_verifier';
  private readonly accessTokenKey = 'spotify_access_token';
  private readonly tokenTypeKey = 'spotify_token_type';
  private readonly refreshTokenKey = 'spotify_refresh_token';
  private readonly tokenExpiresAtKey = 'spotify_token_expires_at';

  private accessToken: string | null = null;
  private tokenType: string | null = null;
  private tokenExpiresAt = 0;
  private refreshInFlight: Observable<string> | null = null;

  private get clientId(): string {
    return environment.spotify.clientId;
  }

  /**
   * Handles PKCE callback, restores a stored session, or returns false.
   */
  initializeAuth(): Observable<SpotifyAuthResult> {
    this.restoreStoredToken();

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      console.error('Spotify authorization denied:', error);
      this.clearAuthQueryParams();
      return of({ authenticated: false, error });
    }

    const code = urlParams.get('code');
    if (!code) {
      if (this.isTokenValid()) {
        return this.ensureValidToken().pipe(
          map(() => ({ authenticated: true })),
          catchError(() => of({ authenticated: false, error: 'token_refresh_failed' })),
        );
      }
      return of({ authenticated: false });
    }

    const state = urlParams.get('state');
    const storedState = localStorage.getItem(this.stateKey);
    if (!state || state !== storedState) {
      console.error('Spotify state mismatch — possible CSRF attempt');
      this.clearAuthQueryParams();
      return of({ authenticated: false, error: 'state_mismatch' });
    }

    const codeVerifier = sessionStorage.getItem(this.codeVerifierKey);
    if (!codeVerifier) {
      console.error('Spotify code verifier missing from session');
      this.clearAuthQueryParams();
      return of({ authenticated: false, error: 'missing_code_verifier' });
    }

    return this.exchangeCodeForToken(code, codeVerifier).pipe(
      tap(() => {
        localStorage.removeItem(this.stateKey);
        sessionStorage.removeItem(this.codeVerifierKey);
        this.clearAuthQueryParams();
      }),
      map(() => ({ authenticated: true })),
      catchError((err) => {
        console.error('Spotify token exchange failed', err);
        return of({ authenticated: false, error: 'token_exchange_failed' });
      }),
    );
  }

  isTokenValid(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS;
  }

  /**
   * Returns a valid access token, refreshing when expired or about to expire.
   */
  ensureValidToken(): Observable<string> {
    if (!this.accessToken) {
      this.restoreStoredToken();
    }

    if (this.isTokenValid() && this.accessToken) {
      return of(this.accessToken);
    }

    const refreshToken = sessionStorage.getItem(this.refreshTokenKey);
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.refreshAccessToken(refreshToken).pipe(
      finalize(() => {
        this.refreshInFlight = null;
      }),
    );

    return this.refreshInFlight;
  }

  async requestAuthorization(): Promise<void> {
    if (!this.clientId) {
      alert('Spotify client ID is not configured. Set SPOTIFY_CLIENT_ID in GitHub Secrets/Variables (CI) or in a local .env file.');
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
      scope: SPOTIFY_SCOPES,
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
    this.tokenExpiresAt = 0;
    sessionStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.tokenTypeKey);
    sessionStorage.removeItem(this.refreshTokenKey);
    sessionStorage.removeItem(this.tokenExpiresAtKey);
    sessionStorage.removeItem(this.codeVerifierKey);
    localStorage.removeItem(this.stateKey);
  }

  getData<T>(apiUrl: string): Observable<T> {
    return this.ensureValidToken().pipe(
      switchMap(() => this.http.get<T>(apiUrl, { headers: this.getHeaders() })),
    );
  }

  /**
   * Fetches all saved tracks, following Spotify pagination links.
   */
  getUserTracks(): Observable<SpotifySavedTracksResponse> {
    const initialUrl = 'https://api.spotify.com/v1/me/tracks/?limit=50';

    return this.getData<SpotifySavedTracksPage>(initialUrl).pipe(
      expand((page) => (page.next ? this.getData<SpotifySavedTracksPage>(page.next) : of())),
      reduce(
        (accumulated, page) => ({
          items: [...accumulated.items, ...page.items],
          total: page.total,
          limit: page.limit,
          offset: page.offset,
          href: page.href,
          next: null,
          previous: page.previous,
        }),
        {
          items: [] as SpotifySavedTracksPage['items'],
          total: 0,
          limit: 50,
          offset: 0,
          href: initialUrl,
          next: null as string | null,
          previous: null as string | null,
        },
      ),
    );
  }

  playTrackOnDevice(deviceId: string, trackUri: string): Observable<void> {
    const url = `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`;

    return this.ensureValidToken().pipe(
      switchMap(() =>
        this.http.put<void>(
          url,
          { uris: [trackUri] },
          { headers: this.getHeaders() },
        ),
      ),
    );
  }

  private refreshAccessToken(refreshToken: string): Observable<string> {
    const body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('refresh_token', refreshToken)
      .set('client_id', this.clientId);

    return this.http
      .post<SpotifyTokenResponse>('https://accounts.spotify.com/api/token', body.toString(), {
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      })
      .pipe(
        tap((response) => this.persistToken(response)),
        map(() => {
          if (!this.accessToken) {
            throw new Error('Token refresh did not produce an access token');
          }
          return this.accessToken;
        }),
      );
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
    this.tokenExpiresAt = Date.now() + response.expires_in * 1000;
    sessionStorage.setItem(this.accessTokenKey, response.access_token);
    sessionStorage.setItem(this.tokenTypeKey, response.token_type);
    sessionStorage.setItem(this.tokenExpiresAtKey, String(this.tokenExpiresAt));
    if (response.refresh_token) {
      sessionStorage.setItem(this.refreshTokenKey, response.refresh_token);
    }
  }

  private restoreStoredToken(): void {
    const token = sessionStorage.getItem(this.accessTokenKey);
    if (token) {
      this.accessToken = token;
      this.tokenType = sessionStorage.getItem(this.tokenTypeKey) ?? 'Bearer';
      const expiresAt = sessionStorage.getItem(this.tokenExpiresAtKey);
      this.tokenExpiresAt = expiresAt ? Number(expiresAt) : 0;
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
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    const combinations =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += combinations.charAt(array[i] % combinations.length);
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

export interface SpotifySavedTrackItem {
  track: {
    id: string;
    uri: string;
    name: string;
    preview_url: string | null;
    track_number: number;
    album: {
      name: string;
      images: { url: string }[];
    };
    artists: { name: string }[];
  } | null;
}

export interface SpotifySavedTracksPage {
  items: SpotifySavedTrackItem[];
  total: number;
  limit: number;
  offset: number;
  href: string;
  next: string | null;
  previous: string | null;
}

export type SpotifySavedTracksResponse = SpotifySavedTracksPage;

export interface SpotifyAuthResult {
  authenticated: boolean;
  error?: string;
}
