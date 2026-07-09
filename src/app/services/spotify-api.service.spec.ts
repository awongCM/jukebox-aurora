import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SpotifyAPIService } from './spotify-api.service';

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

    let authenticated = false;
    service.initializeAuth().subscribe((result) => {
      authenticated = result;
    });

    expect(authenticated).toBeTrue();
    expect(service.isTokenValid()).toBeTrue();
  });

  it('rejects callback when OAuth state does not match', () => {
    localStorage.setItem('spotify_auth_state', 'expected-state');
    window.history.pushState({}, '', '/?code=auth-code&state=wrong-state');
    sessionStorage.setItem('spotify_code_verifier', 'verifier');

    let authenticated = true;
    service.initializeAuth().subscribe((result) => {
      authenticated = result;
    });

    expect(authenticated).toBeFalse();
    httpMock.expectNone('https://accounts.spotify.com/api/token');
    window.history.pushState({}, '', '/');
  });

  it('exchanges authorization code for an access token', () => {
    localStorage.setItem('spotify_auth_state', 'expected-state');
    sessionStorage.setItem('spotify_code_verifier', 'verifier');
    window.history.pushState({}, '', '/?code=auth-code&state=expected-state');

    let authenticated = false;
    service.initializeAuth().subscribe((result) => {
      authenticated = result;
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

    expect(authenticated).toBeTrue();
    expect(service.isTokenValid()).toBeTrue();
    expect(sessionStorage.getItem('spotify_access_token')).toBe('fresh-token');
    window.history.pushState({}, '', '/');
  });

  it('clears stored credentials on logout', () => {
    sessionStorage.setItem('spotify_access_token', 'stored-token');
    sessionStorage.setItem('spotify_token_type', 'Bearer');
    sessionStorage.setItem('spotify_refresh_token', 'refresh-token');

    service.endAuthorizationRequest();

    expect(service.isTokenValid()).toBeFalse();
    expect(sessionStorage.getItem('spotify_access_token')).toBeNull();
    expect(sessionStorage.getItem('spotify_refresh_token')).toBeNull();
  });
});
