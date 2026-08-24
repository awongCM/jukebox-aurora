import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SpotifyAPIService, SpotifyAuthResult } from './spotify-api.service';

describe('SpotifyAPIService', () => {
  let service: SpotifyAPIService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SpotifyAPIService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SpotifyAPIService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('restores a stored access token on initializeAuth', () => {
    sessionStorage.setItem('spotify_access_token', 'stored-token');
    sessionStorage.setItem('spotify_token_type', 'Bearer');
    sessionStorage.setItem('spotify_token_expires_at', String(Date.now() + 3_600_000));

    let result: SpotifyAuthResult = { authenticated: false };
    service.initializeAuth().subscribe((authResult) => {
      result = authResult;
    });

    expect(result.authenticated).toBeTrue();
    expect(service.isTokenValid()).toBeTrue();
  });

  it('returns an error when Spotify denies authorization', () => {
    window.history.pushState({}, '', '/?error=access_denied');

    let result: SpotifyAuthResult = { authenticated: true };
    service.initializeAuth().subscribe((authResult) => {
      result = authResult;
    });

    expect(result.authenticated).toBeFalse();
    expect(result.error).toBe('access_denied');
    httpMock.expectNone('https://accounts.spotify.com/api/token');
    window.history.pushState({}, '', '/');
  });

  it('rejects callback when OAuth state does not match', () => {
    localStorage.setItem('spotify_auth_state', 'expected-state');
    window.history.pushState({}, '', '/?code=auth-code&state=wrong-state');
    sessionStorage.setItem('spotify_code_verifier', 'verifier');

    let result: SpotifyAuthResult = { authenticated: true };
    service.initializeAuth().subscribe((authResult) => {
      result = authResult;
    });

    expect(result.authenticated).toBeFalse();
    expect(result.error).toBe('state_mismatch');
    httpMock.expectNone('https://accounts.spotify.com/api/token');
    window.history.pushState({}, '', '/');
  });

  it('exchanges authorization code for an access token', () => {
    localStorage.setItem('spotify_auth_state', 'expected-state');
    sessionStorage.setItem('spotify_code_verifier', 'verifier');
    window.history.pushState({}, '', '/?code=auth-code&state=expected-state');

    let result: SpotifyAuthResult = { authenticated: false };
    service.initializeAuth().subscribe((authResult) => {
      result = authResult;
    });

    const request = httpMock.expectOne('https://accounts.spotify.com/api/token');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toContain('grant_type=authorization_code');
    expect(request.request.body).toContain('code=auth-code');
    expect(request.request.body).toContain('code_verifier=verifier');
    request.flush({
      access_token: 'fresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'user-library-read',
    });

    expect(result.authenticated).toBeTrue();
    expect(service.isTokenValid()).toBeTrue();
    expect(sessionStorage.getItem('spotify_access_token')).toBe('fresh-token');
    window.history.pushState({}, '', '/');
  });

  it('clears stored credentials on logout', () => {
    sessionStorage.setItem('spotify_access_token', 'stored-token');
    sessionStorage.setItem('spotify_token_type', 'Bearer');
    sessionStorage.setItem('spotify_refresh_token', 'refresh-token');
    sessionStorage.setItem('spotify_token_expires_at', String(Date.now() + 3_600_000));

    service.endAuthorizationRequest();

    expect(service.isTokenValid()).toBeFalse();
    expect(sessionStorage.getItem('spotify_access_token')).toBeNull();
    expect(sessionStorage.getItem('spotify_refresh_token')).toBeNull();
  });

  it('refreshes an expired stored session during initializeAuth', () => {
    sessionStorage.setItem('spotify_access_token', 'expired-token');
    sessionStorage.setItem('spotify_token_type', 'Bearer');
    sessionStorage.setItem('spotify_refresh_token', 'refresh-token');
    sessionStorage.setItem('spotify_token_expires_at', String(Date.now() - 1_000));

    let result: SpotifyAuthResult = { authenticated: false };
    service.initializeAuth().subscribe((authResult) => {
      result = authResult;
    });

    const request = httpMock.expectOne('https://accounts.spotify.com/api/token');
    expect(request.request.body).toContain('grant_type=refresh_token');
    expect(request.request.body).toContain('refresh_token=refresh-token');
    request.flush({
      access_token: 'refreshed-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'user-library-read streaming',
    });

    expect(result.authenticated).toBeTrue();
    expect(service.isTokenValid()).toBeTrue();
    expect(sessionStorage.getItem('spotify_access_token')).toBe('refreshed-token');
  });

  it('sends a single refresh request when two callers race', () => {
    sessionStorage.setItem('spotify_access_token', 'expired-token');
    sessionStorage.setItem('spotify_token_type', 'Bearer');
    sessionStorage.setItem('spotify_refresh_token', 'refresh-token');
    sessionStorage.setItem('spotify_token_expires_at', String(Date.now() - 1_000));

    const tokens: string[] = [];
    service.ensureValidToken().subscribe((token) => tokens.push(token));
    service.ensureValidToken().subscribe((token) => tokens.push(token));

    const requests = httpMock.match('https://accounts.spotify.com/api/token');
    expect(requests.length).toBe(1);
    requests[0].flush({
      access_token: 'refreshed-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'user-library-read',
    });

    expect(tokens).toEqual(['refreshed-token', 'refreshed-token']);
  });

  it('reports a restorable session when only a refresh token remains', () => {
    sessionStorage.setItem('spotify_refresh_token', 'refresh-token');

    expect(service.hasSession()).toBeTrue();
    expect(service.isTokenValid()).toBeFalse();
  });

  it('refreshes an expired access token', () => {
    sessionStorage.setItem('spotify_access_token', 'expired-token');
    sessionStorage.setItem('spotify_token_type', 'Bearer');
    sessionStorage.setItem('spotify_refresh_token', 'refresh-token');
    sessionStorage.setItem('spotify_token_expires_at', String(Date.now() - 1_000));

    let token = '';
    service.ensureValidToken().subscribe((accessToken) => {
      token = accessToken;
    });

    const request = httpMock.expectOne('https://accounts.spotify.com/api/token');
    expect(request.request.body).toContain('grant_type=refresh_token');
    expect(request.request.body).toContain('refresh_token=refresh-token');
    request.flush({
      access_token: 'refreshed-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'user-library-read',
    });

    expect(token).toBe('refreshed-token');
    expect(service.isTokenValid()).toBeTrue();
  });

  it('follows pagination when loading saved tracks', () => {
    sessionStorage.setItem('spotify_access_token', 'valid-token');
    sessionStorage.setItem('spotify_token_type', 'Bearer');
    sessionStorage.setItem('spotify_token_expires_at', String(Date.now() + 3_600_000));

    let totalItems = 0;
    service.getUserTracks().subscribe((response) => {
      totalItems = response.items.length;
    });

    const firstPage = httpMock.expectOne(
      'https://api.spotify.com/v1/me/tracks/?limit=50',
    );
    firstPage.flush({
      items: [{ track: { id: 'track-1', uri: 'spotify:track:track-1', name: 'One', preview_url: null, track_number: 1, album: { name: 'Album', images: [] }, artists: [{ name: 'Artist' }] } }],
      total: 2,
      limit: 50,
      offset: 0,
      href: 'https://api.spotify.com/v1/me/tracks/?limit=50',
      next: 'https://api.spotify.com/v1/me/tracks/?limit=50&offset=50',
      previous: null,
    });

    const secondPage = httpMock.expectOne(
      'https://api.spotify.com/v1/me/tracks/?limit=50&offset=50',
    );
    secondPage.flush({
      items: [{ track: { id: 'track-2', uri: 'spotify:track:track-2', name: 'Two', preview_url: null, track_number: 1, album: { name: 'Album', images: [] }, artists: [{ name: 'Artist' }] } }],
      total: 2,
      limit: 50,
      offset: 50,
      href: 'https://api.spotify.com/v1/me/tracks/?limit=50&offset=50',
      next: null,
      previous: 'https://api.spotify.com/v1/me/tracks/?limit=50',
    });

    expect(totalItems).toBe(2);
  });
});
