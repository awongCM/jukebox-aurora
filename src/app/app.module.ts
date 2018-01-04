import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { SpotifyAPIService } from './services/spotify-api.service';
import { GooglePlayMusicAPIService } from './services/gp-music-api.service';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpModule
  ],
  providers: [SpotifyAPIService, GooglePlayMusicAPIService],
  bootstrap: [AppComponent]
})
export class AppModule { }
