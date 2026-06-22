/**
 * Copy this file to environment.ts and fill in your local values.
 * environment.ts is gitignored when you use environment.local.ts overrides.
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
