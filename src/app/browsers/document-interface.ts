export interface DocumentInterface extends HTMLElement {
  requestFullscreen(): boolean;
  mozRequestFullScreen(): boolean;
  webkitRequestFullscreen(): boolean;
  msRequestFullscreen(): boolean;
}
