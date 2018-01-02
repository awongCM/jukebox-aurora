import { Component, OnInit } from '@angular/core';
import { SpotifyAPIService } from './services/spotify-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'JukeBox Aurora App';
  private tracks: any[];

  // jukebox properties
  selected_track = null;
  isPlaying = false;
  audio = null;
  disc = null;

  // gallery properties
  readonly THRESHOLD: Number = 0.6;
  readonly MAX_SPEED: Number = 25;
  readonly DEFAULT_SPEED: Number = 7;
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

  constructor(public spotifyAPI: SpotifyAPIService) {
    console.log('Hello Jukebox Aurora App initialised');
  }

  ngOnInit(): void {
    this.spotifyAPI.checkValidAuthorization();

    if (this.hasValidToken()) {
      this.spotifyAPI.getUserTracks().subscribe(data => {
          console.log('data.items', data.items);
          let tracks = data.items.map( (item) => item.track);
          this.tracks = tracks;
      });
    }
  }

  login() {
    this.spotifyAPI.requestAuthorization();
  }

  logout() {
    this.spotifyAPI.endAuthorizationRequest();
    window.location.reload();
  }

  toggle() {
    document.getElementById('gallery').classList.toggle('js-expanded');
  }

  fullscreen() {
    let fullScreen = <HTMLDivElement>document.getElementById('fullscreen');

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

    // reset webkit animations when switching tracks
    this.disc = document.getElementById('disc');
    console.log('disc ob', this.disc);
    this.disc.style.webkitAnimation = 'none';
    setTimeout(function() {
      this.disc.style.webkitAnimation = '';
  }, 10);
  }

  display_album_artwork() {
    return (this.selected_track !== null) ? this.selected_track.album.images[0].url : 'http://via.placeholder.com/250x250';
  }

  display_album_title() {
    return (this.selected_track !== null) ? this.selected_track.name : 'No audio track is chosen';
  }

  display_album_url() {
    return (this.selected_track !== null) ? this.selected_track.preview_url : '';
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

  // TODOS
  scroll_tracks(event) {
    this.pageX = event.clientX || event.screenX;
    this.screenWidth = window.innerWidth;
    this.currentPosPercentage = (this.screenWidth - this.pageX) / this.screenWidth;

    if (this.currentPosPercentage > this.THRESHOLD) {
      // speed = calculateSpeed(LEFT, currentPosPercentage);
      // setScroll(LEFT,speed);
      this.setScroll(this.LEFT, this.DEFAULT_SPEED);
    } else if (this.currentPosPercentage < (1 - this.THRESHOLD)) {
      // speed = calculateSpeed(RIGHT, currentPosPercentage);
      // setScroll(RIGHT,speed);
      this.setScroll(this.RIGHT, this.DEFAULT_SPEED);
    } else {
      this.endScroll();
    }
  }

  private calculateSpeed(direction, ratio) {
    this.positionPercentage = direction === this.LEFT ? ratio : 1 - ratio;
    this.speedPercentage = (this.positionPercentage - this.THRESHOLD) / (1 - this.THRESHOLD);

    return this.speedPercentage * this.MAX_SPEED;
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
    if (this.spotifyAPI.isTokenValid()) {
      return true;
    } else {
      return false;
    }
  }
}
