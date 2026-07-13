// TODO - implement iTunes Music Search API service (Phase 2)

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ItunesMusicSearchAPIService {
  private readonly http = inject(HttpClient);

  searchTracks(term: string): Observable<unknown> {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song`;
    return this.http.get(url);
  }
}
