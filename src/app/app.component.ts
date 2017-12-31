import { Component, OnInit } from '@angular/core';
import { Http, Response, RequestOptions, Headers, URLSearchParams } from '@angular/http';
import 'rxjs/add/operator/map';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'JukeBox Aurora App';
  
  // TODO - to put this into services/interface
  client_id = '976b920abb9946b987f1dfe7e95c1942';
  client_secret = '049a3cf08f10408183111691d56fd6c0';
  redirect_uri = 'http://localhost:4200';
  
  // LocalStorage
  state_key = 'spotity_auth_state';

  // TODO
  public accessToken: string;
  public tokenType: string;

  public tracks: any[];
  public albums: any[];
  data: any = {};

  constructor(private http: Http) {
    console.log('Hello Jukebox Aurora App initialised');
  }

  /**
   * login Spotify Account
   */
  login() {
    this.requestAuthorization();
  }

  /**
   * logout Spotify Account
   */
  logout() {
    this.endAuthorizationRequest();
    window.location.reload();
  }

  ngOnInit(): void {
    this.checkValidAuthorization();

    //load user tracks if a valid token has been successfully obtained;
    if (this.hasValidToken()) {
      this.getUserTracks();
    }
  }

  /**
   * checkValidAuthorization
   */
  public checkValidAuthorization(): void {
    const hashParams = this.getHashParams(),
          { access_token, token_type, state } = hashParams;

    const storedState = localStorage.getItem(this.state_key);

    if (access_token && (state == null || state !== storedState)) {
      alert('Authentication Error detected');
    } else {
      localStorage.removeItem(this.state_key);
      if (access_token) {
        // console.log('access token found!', access_token);
        // console.log('token type found!', token_type);
        // console.log('state found!', state);

        // remove hash
        window.location.hash = '';

        this.accessToken = access_token;
        this.tokenType = token_type;
      }
    }
  }

  /**
   * hasValidToken
   */
  public hasValidToken(): boolean {
    if (this.accessToken) {
      return true;
    }
    return false;
  }

  /**
   * getUserTracks
   */
  public getUserTracks(): void {
    this.getData('https://api.spotify.com/v1/me/tracks/').subscribe(data => {
      console.log('data.items', data.items);
      this.data = data;

      let tracks = data.items.map( (item) => item.track);
      console.log('tracks', tracks);
      this.tracks = tracks;
    });
  }

  /**
   * getHashParams
   */
  public getHashParams(): any {
    const hashParams = {};
    let e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
  }

  private _generateRandomString(length): string {
    let random_str = '';
    const combinations = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      random_str += combinations.charAt(Math.floor(Math.random() * combinations.length));
    }
    return random_str;
  }

  /**
   * requestAuthorization using implicit grant access only
   */
  public requestAuthorization(): void {
    let authorizationTokenUrl = 'https://accounts.spotify.com/authorize';

    let state_value = this._generateRandomString(16);
    localStorage.setItem(this.state_key, state_value);

    let query_params =  [ '?response_type=token', `client_id=${this.client_id}`,
                          'scope=user-library-read', `redirect_uri=${this.redirect_uri}`,
                          `state=${state_value}`
                        ].join('&');

    window.location = authorizationTokenUrl + query_params;
  }

  /**
   * endAuthorizationRequest
   */
  public endAuthorizationRequest(): void {
    this.accessToken = null;
  }

  public getData(api_url) {
    const options = this.getOptions();

    return this.http.get(api_url, options)
      .map((res: Response) => res.json());
  }

  /**
   * getOptions
   */
  public getOptions(): any {
    let headers = new Headers();
    headers.append('Authorization', this.tokenType + ' ' + this.accessToken);
    let options = new RequestOptions({headers: headers});

    return options;
  }
}
