export interface Track {
  album_artwork: string;
  id: string;
  title: string;
  album: string;
  artist: string;
  stream_url: string;
}

/**
|--------------------------------------------------
| TODO - about the music service api interface
|--------------------------------------------------
*/
export interface MusicAPIInterface {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  state_key: string;
  checkValidAuthorization();
  isTokenValid();
  getHashParams();
  requestAuthorization();
  endAuthorizationRequest();
  getData();
  getOptions();
  getUserTracks();
}
