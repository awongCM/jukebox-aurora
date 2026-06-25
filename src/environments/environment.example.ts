/**
 * Template for local development — safe to commit (no real credentials).
 * Copy to environment.ts (gitignored) and add your Spotify client ID locally.
 *
 * @see MODERNIZATION_LOG.md — "Environment-based configuration"
 */
export const environment = {
  production: false,
  spotify: {
    clientId: 'your-spotify-client-id',
    redirectUri: 'http://127.0.0.1:4200',
  },
  googleMusicApi: {
    baseUrl: 'http://localhost:5000/api',
  },
};
