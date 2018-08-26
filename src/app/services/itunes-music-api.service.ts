// TODO - to implemetnt Itunes Music Search API services

import { Injectable } from '@angular/core';
import { Http, RequestOptions, Response, Headers } from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class ItunesMusicSearchAPIService {
  client_id = '';
  client_secret = '';
  redirect_uri = '';
  state_key = '';

  private accessToken: any = null;
  private tokenType: string = null;

  constructor(private http: Http) { }

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
        // remove hash
        window.location.hash = '';

        this.accessToken = access_token;
        this.tokenType = token_type;
      }
    }
  }

  /**
   * isTokenValid
   */
  public isTokenValid(): boolean {
    return this.accessToken !== null;
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

  private generateRandomString(length): string {
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

    let state_value = this.generateRandomString(16);
    localStorage.setItem(this.state_key, state_value);

    let query_params =  [ '?response_type=token', `client_id=${this.client_id}`,
                          'scope=user-library-read', `redirect_uri=${this.redirect_uri}`,
                          `state=${state_value}`
                        ].join('&');

    window.location.href = authorizationTokenUrl + query_params;
  }

  /**
   * endAuthorizationRequest
   */
  public endAuthorizationRequest(): void {
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
    headers.append('Authorization', this.tokenType + ' ' + this.accessToken);
    let options = new RequestOptions({headers: headers});

    return options;
  }

  /**
   * getUserTracks
   */
  public getUserTracks(): any {
    return this.getData('https://api.spotify.com/v1/me/tracks/');
  }

}
