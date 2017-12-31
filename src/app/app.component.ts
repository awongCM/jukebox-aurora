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
    let fullScreen = document.getElementById('fullscreen');

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
