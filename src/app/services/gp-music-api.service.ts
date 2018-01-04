import { Injectable } from '@angular/core';
import { Http, RequestOptions, Response, Headers } from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class GooglePlayMusicAPIService {
  email = '';
  password = '';
  state_key = 'google_music_access_token';
  private accessToken: any = null;

  constructor(private http: Http) { }

  /**
   * checkValidAuthorization
   */
  public checkValidAuthorization(): void {
    const storedAccessToken = localStorage.getItem(this.state_key);

    if (!storedAccessToken) {
      console.log('Authentication Error Detected.');
    } else {
      console.log('Authentication Successful!');
      this.accessToken = storedAccessToken;
    }
  }

  /**
   * isTokenValid
   */
  public isTokenValid(): boolean {
    return this.accessToken !== null;
  }

  /**
   * requestAuthorization using implicit grant access only
   */
  public requestAuthorization(): void {
    let authorizationTokenUrl = 'http://api.dev.local:5000/api/login';

    const options = this.getOptions();

    this.http.post(authorizationTokenUrl, options)
      .map((res: Response) => res.json())
      .subscribe(data => {
        console.log('Google Authorization Tokens', data);
        localStorage.setItem(this.state_key, data.accessToken);
        window.location.reload();
      });

  }

  /**
   * endAuthorizationRequest
   */
  public endAuthorizationRequest(): void {
    localStorage.removeItem(this.state_key);
    this.accessToken = null;
  }

  /**
   * getData
   */
  public getData(api_url) {
    const options = this.getOptions();

    return this.http.get(api_url, options)
      .map((res: Response) => res.json());
  }

  /**
   * getOptions
   */
  private getOptions(): any {
    let headers = new Headers();
    headers.append('Access-Control-Allow-Origin', '*');
    let options = new RequestOptions({headers: headers});

    return options;
  }

  /**
   * getUserTracks
   */
  public getUserTracks(): any {
    return this.getData('http://api.dev.local:5000/api/songs/');
  }

  /**
   * getStreamUrl
   */
  public getStreamUrl(id): any {
    return this.getData(`http://api.dev.local:5000/api/songs/${id}`);
  }
}
