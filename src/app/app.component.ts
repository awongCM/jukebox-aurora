import { Component } from '@angular/core';
import { Http, Response, RequestOptions, Headers, URLSearchParams } from '@angular/http';
import 'rxjs/add/operator/map';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'JukeBox Aurora App';
  // TODO - to put this into services/interface
  client_id = '976b920abb9946b987f1dfe7e95c1942';
  client_secret = '049a3cf08f10408183111691d56fd6c0';
  redirect_uri = 'http://localhost:4200';

  // TODO
  public accessToken: string;
  public tokenType: string;
  public tracks: any[];
  public albums: any[];
  data: any = {};

  constructor(private http: Http) {
    console.log('Hello Jukebox Aurora App initialised');

    const hashParams = this.getHashParams();

    const access_token = hashParams.access_token,
          token_type = hashParams.token_type,
          state = hashParams.state;

    if (!access_token) {
      this.requestAuthorization();
    } else {
      console.log('access token found!', access_token);
      console.log('token type found!', token_type);
      console.log('state found!', state);

      // remove hash
      window.location.hash = '';

      this.accessToken = access_token;
      this.tokenType = token_type;

      this.getUserTracks();
    }
  }

  /**
   * getUserTracks
   */
  public getUserTracks() {
    this.getData('https://api.spotify.com/v1/me/tracks/').subscribe(data => {
      console.log(data.items);
      this.data = data;

      let tracks = data.items.map( (item) => {return item.track});
      console.log('tracks', tracks);
      this.tracks = tracks;
    });
  }

  /**
   * getHashParams
   */
  public getHashParams() {
    const hashParams = {};
    let e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
  }

  /**
   * requestAuthorization using implicit grant access only
   */
  public requestAuthorization() {
    let authorizationTokenUrl = 'https://accounts.spotify.com/authorize';
    let query_params =  [ '?response_type=token', `client_id=${this.client_id}`,
                          'scope=user-library-read', `redirect_uri=${this.redirect_uri}`,
                        ].join('&');

    window.location = authorizationTokenUrl + query_params;
  }

  public getData(api_url) {
    const options = this.getOptions();

    return this.http.get(api_url, options)
      .map((res: Response) => res.json());
  }

  /**
   * getOptions
   */
  public getOptions() {
    let headers = new Headers();
    headers.append('Authorization', this.tokenType + ' ' + this.accessToken);
    let options = new RequestOptions({headers: headers});

    return options;
  }
}
