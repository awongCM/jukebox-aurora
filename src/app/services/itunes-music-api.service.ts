import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Track } from './jukebox-interface';

interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesTrackResult[];
}

interface ItunesTrackResult {
  trackId: number;
  trackName: string;
  collectionName: string;
  artistName: string;
  previewUrl?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
}

@Injectable({ providedIn: 'root' })
export class ItunesMusicSearchAPIService {
  private readonly http = inject(HttpClient);

  searchTracks(term: string): Observable<Track[]> {
    const url =
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
      '&media=music&entity=song&limit=50';

    return this.http.get<ItunesSearchResponse>(url).pipe(
      map((response) =>
        (response.results ?? []).map((result) => ({
          id: String(result.trackId),
          title: result.trackName,
          album: result.collectionName,
          artist: result.artistName,
          album_artwork: this.artworkUrl(result.artworkUrl100 ?? result.artworkUrl60),
          stream_url: result.previewUrl ?? '',
        })),
      ),
    );
  }

  private artworkUrl(url: string | undefined): string {
    if (!url) {
      return '';
    }
    return url.replace(/\/\d+x\d+/, '/300x300');
  }
}
