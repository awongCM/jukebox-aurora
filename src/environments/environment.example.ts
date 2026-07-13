/**
 * Reference template — values are injected at build time.
 *
 * - CI: GitHub Actions Secrets/Variables → scripts/generate-environment.js
 * - Local: copy .env.example to .env and run npm start
 *
 * @see README.md — "Configuration (GitHub Secrets & Variables)"
 */
export const environment = {
  production: false,
  spotify: {
    clientId: '',
    redirectUri: 'http://127.0.0.1:4200',
  },
  googleMusicApi: {
    baseUrl: 'http://localhost:5000/api',
  },
};
