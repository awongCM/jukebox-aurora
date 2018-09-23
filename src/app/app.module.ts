import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { SpotifyAPIService } from './services/spotify-api.service';
import { GooglePlayMusicAPIService } from './services/gp-music-api.service';

import { ScriptService } from './services/script.service';
import { TitleHeaderComponent } from './title-header/title-header.component';
import { ButtonGroupComponent } from './button-group/button-group.component';
import { PlaylistCarouselComponent } from './playlist-carousel/playlist-carousel.component';
import { JukeboxPlayerComponent } from './jukebox-player/jukebox-player.component';

@NgModule({
  declarations: [
    AppComponent,
    TitleHeaderComponent,
    ButtonGroupComponent,
    PlaylistCarouselComponent,
    JukeboxPlayerComponent
  ],
  imports: [
    BrowserModule,
    HttpModule
  ],
  providers: [SpotifyAPIService, GooglePlayMusicAPIService, ScriptService],
  bootstrap: [AppComponent]
})
export class AppModule { }
