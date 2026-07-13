import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ItunesMusicSearchAPIService } from './itunes-music-api.service';

describe('ItunesMusicSearchAPIService', () => {
  let service: ItunesMusicSearchAPIService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ItunesMusicSearchAPIService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ItunesMusicSearchAPIService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps iTunes search results to Track objects', () => {
    let tracks: { id: string; title: string }[] = [];
    service.searchTracks('aurora').subscribe((results) => {
      tracks = results;
    });

    const request = httpMock.expectOne((req) =>
      req.url.includes('itunes.apple.com/search') && req.url.includes('term=aurora'),
    );
    request.flush({
      resultCount: 1,
      results: [{
        trackId: 123,
        trackName: 'Runaway',
        collectionName: 'A Different Kind of Human',
        artistName: 'AURORA',
        previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
        artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/100x100.jpg',
      }],
    });

    expect(tracks.length).toBe(1);
    expect(tracks[0].id).toBe('123');
    expect(tracks[0].title).toBe('Runaway');
  });
});
