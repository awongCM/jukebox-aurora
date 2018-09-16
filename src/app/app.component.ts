import { Component, OnInit } from '@angular/core';
import { SpotifyAPIService } from './services/spotify-api.service';
import { GooglePlayMusicAPIService } from './services/gp-music-api.service';
import { Track } from './services/jukebox-interface';
import { DocumentInterface } from './browsers/document-interface';
import { Window } from './browsers/window-interface';
import { ScriptService } from './services/script.service';


declare global {
  interface Window { onSpotifyWebPlaybackSDKReady(): any; }
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Welcome to my JukeBox Aurora App';
  tracks: Track[];

  //checkbox properties
  selected_radio_api_service = null;
  radio_api_service_state_key = "selected_api_service";

  // jukebox properties
  selected_track: Track = null;
  isPlaying = false;
  audio = null;
  disc = null;

  // gallery properties
  readonly THRESHOLD: number = 0.6;
  readonly MAX_SPEED: number = 25;
  readonly DEFAULT_SPEED: number = 7;
  readonly LEFT: String = 'left';
  readonly RIGHT: String = 'right';

  private scrolling: number;
  private pageX: number;
  private screenWidth: number;
  private currentPosPercentage: number;
  private speed: number;
  private newPos: number;
  private positionPercentage: number;
  private speedPercentage: number;

  constructor(public spotifyAPI: SpotifyAPIService, public gmusicAPI: GooglePlayMusicAPIService, public scriptService: ScriptService) {
    console.log('Hello Jukebox Aurora App initialised');

    scriptService.loadScript('spotifysdk').then(data => {
      this.initiateWebPlayback();
    });
  }

  private initiateWebPlayback(): void {
      (window as Window).onSpotifyWebPlaybackSDKReady = () => {
        const token = '[My Spotify Web API access token]';
        console.log(token);
      };
  }

  ngOnInit(): void {
    this.selected_radio_api_service = localStorage.getItem(this.radio_api_service_state_key);

    this.refreshTitle();

    if (this.selected_radio_api_service === 'SPM') {
      this.spotifyAPI.checkValidAuthorization();
      if (this.hasValidToken()) {
        this.spotifyAPI.getUserTracks().subscribe(data => {
            console.log('data.items', data.items);

            const tracks = data.items.map( (item) => {
              let track: Track = {
                album_artwork: item.track.album.images[1].url,
                id: item.track.track_number,
                title: item.track.name,
                album: item.track.album.name,
                artist: item.track.artists[0].name,
                stream_url: item.track.preview_url
              };
              return track;
            });
            this.tracks = tracks;
        });
      }
    } else {
      this.gmusicAPI.checkValidAuthorization();
      if (this.hasValidToken()) {
        this.gmusicAPI.getUserTracks().subscribe(data => {
          console.log('data.songs', data.songs);

          const tracks = data.songs.map((song) => {
            let track: Track = {
              album_artwork: song.albumArtRef[0].url,
              id: song.id,
              title: song.title,
              album: song.album,
              artist: song.artist,
              stream_url: song.stream_url
            };
            return track;
          });
          this.tracks = tracks;
        });
      }
    }
  }

  private refreshTitle(): void {
    if (this.selected_radio_api_service === 'SPM') {
      this.title = "Spotify Music Collection";
    } else if (this.selected_radio_api_service === 'GPM') {
      this.title = "Google Play Collection";
    }
  }

  login() {
    if (this.selected_radio_api_service === 'SPM') {
      this.spotifyAPI.requestAuthorization();
    } else {
      this.gmusicAPI.requestAuthorization();
    }
  }

  logout() {
    if (this.selected_radio_api_service === 'SPM') {
      this.spotifyAPI.endAuthorizationRequest();
    } else {
      this.gmusicAPI.endAuthorizationRequest();
    }

    //removed selected api service upon logout
    localStorage.removeItem(this.radio_api_service_state_key);
    window.location.reload();
  }

  toggle_radio_api_server(value) {
    this.selected_radio_api_service = value;

    // store selected api service prior to logon
    localStorage.setItem(this.radio_api_service_state_key, value);
  }

  toggle() {
    document.getElementById('gallery').classList.toggle('js-expanded');
  }

  fullscreen() {
    const fullScreen = <DocumentInterface>document.getElementById('fullscreen');

    if (fullScreen.requestFullscreen) {
      fullScreen.requestFullscreen();
		} else if (fullScreen.mozRequestFullScreen) {
      fullScreen.mozRequestFullScreen();
		} else if (fullScreen.webkitRequestFullscreen) {
      fullScreen.webkitRequestFullscreen();
		} else if (fullScreen.msRequestFullscreen) {
      fullScreen.msRequestFullscreen();
    }
  }

  track_select(track) {
    console.log('track selected', track );
    this.selected_track = track;
    this.isPlaying = false;

    if (this.selected_radio_api_service === 'GPM') {
      this.gmusicAPI.getStreamUrl(this.selected_track.id).subscribe(data => {
        console.log("stream_url", data.stream_url);
        this.selected_track.stream_url = data.stream_url;
      });
    }

    // reset webkit animations when switching tracks
    this.disc = document.getElementById('disc');
    console.log('disc ob', this.disc);
    this.disc.style.webkitAnimation = 'none';
    setTimeout(function() {
      this.disc.style.webkitAnimation = '';
    }, 10);
  }

  display_album_artwork() {
    return this.display_template_data('album_artwork', 'http://via.placeholder.com/250x250');
  }

  display_track_title() {
    return this.display_template_data('title', 'No audio track is chosen');
  }

  display_album_url() {
    return this.display_template_data('stream_url', '');
  }

  private display_template_data(data_prop, default_value) {
    if (this.selected_track !== null && this.selected_track[data_prop] !== null) {
      return this.selected_track[data_prop];
    } else {
      return default_value;
    }
  }

  pause_play_track(event) {
    event.preventDefault();

    this.isPlaying = !this.isPlaying;

    if (this.audio === null) {
      this.audio = document.getElementById('player_audio');
      this.audio.src = this.display_album_url();
      this.audio.load();
    }

    console.log('audio obj', this.audio);

    if (this.isPlaying) {
      this.audio.play();
    } else {
      this.audio.pause();
    }

  }

  pause_play_state() {
    return (this.isPlaying) ? 'running' : 'paused';
  }

  reset_play_state() {
    console.log('audio ended');
    this.isPlaying = false;
  }

  /**
  |--------------------------------------------------
  | Scroll track carousel to the left/right
  |--------------------------------------------------
  */
  scroll_tracks(event) {
    this.pageX = event.clientX || event.screenX;
    this.screenWidth = window.innerWidth;
    this.currentPosPercentage = (this.screenWidth - this.pageX) / this.screenWidth;

    if (this.currentPosPercentage > this.THRESHOLD) {
      this.setScroll(this.LEFT, this.DEFAULT_SPEED);
    } else if (this.currentPosPercentage < (1 - this.THRESHOLD)) {
      this.setScroll(this.RIGHT, this.DEFAULT_SPEED);
    } else {
      this.endScroll();
    }
  }

  private setScroll(direction, speed) {
    this.endScroll();
		this.scrolling = setInterval( () => {
        this.newPos = direction === this.LEFT ? (-1 * speed) : speed;
        document.getElementById('gallery').scrollLeft += this.newPos;
			}, 10);
  }

  private endScroll() {
    clearInterval(this.scrolling);
  }

  /**
   * hasValidToken
   */
  public hasValidToken(): boolean {
    if (this.selected_radio_api_service === 'SPM') {
      if (this.spotifyAPI.isTokenValid()) {
        return true;
      } else {
        return false;
      }
    } else {
      if (this.gmusicAPI.isTokenValid()) {
        return true;
      } else {
        return false;
      }
    }
  }
}
