import { Component } from '@angular/core';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/map';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  // TODO
  private apiURL = 'https://some-api-url/';
  data: any = {};

  constructor(private http: Http) {
    console.log('Hello fellow user');
    this.getContacts();
  }

  /**
   * name
   */
  public getContacts() {
    this.getData().subscribe(data => {
      console.log(data);
      this.data = data;
    });
  }

  public getData() {
    return this.http.get(this.apiURL)
      .map((res: Response) => res.json());
  }
}
