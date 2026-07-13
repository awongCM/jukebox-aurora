export interface Track {
  album_artwork: string;
  id: string;
  title: string;
  album: string;
  artist: string;
  stream_url: string;
}

/**
 * Shared contract for music provider services.
 * Full implementation planned for Phase 2 (provider strategy pattern).
 */
export interface MusicAPIInterface {
  stateKey: string;
  checkValidAuthorization(): void;
  isTokenValid(): boolean;
  requestAuthorization(): void;
  endAuthorizationRequest(): void;
  getUserTracks(): unknown;
}
