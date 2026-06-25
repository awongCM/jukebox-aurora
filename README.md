# Jukebox Aurora

Jukebox Music Playing App — browse your music collection from cloud APIs on a colourful, animated jukebox with aurora lighting.

![Animated Jukebox](jukebox-animated.gif)

> **Modernization in progress.** This app originated as an Angular 4/5 pet project (~2017–2018). Phase 1 (June 2025) brought the toolchain up to current standards. See **[MODERNIZATION_LOG.md](MODERNIZATION_LOG.md)** for the full history of why and how we are modernizing.

## Quick start

**Requirements:** Node.js 20 or later.

```bash
npm install
cp src/environments/environment.example.ts src/environments/environment.ts
# Edit environment.ts locally with your Spotify client ID — this file is gitignored

npm start
```

Open [http://127.0.0.1:4200](http://127.0.0.1:4200) — use this address, not `localhost` (Spotify requires loopback IP for local redirects).

### Cursor Cloud Agents

Cloud environment config is committed at [`.cursor/environment.json`](.cursor/environment.json). See [AGENTS.md](AGENTS.md) for agent setup and verification steps.

### Spotify developer setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → your app → **Settings**.
2. Under **Redirect URIs**, add exactly: `http://127.0.0.1:4200`
3. Remove `http://localhost:4200` if present — Spotify no longer accepts plain `localhost` for new apps.
4. Copy your **Client ID** into `src/environments/environment.ts`.
5. Select **Spotify** on the login screen, click **Log In**, approve access — you should return to the jukebox app.

### Optional: legacy Google Play Music proxy

Google Play Music was discontinued in 2020. The Express backend remains for reference only.

```bash
npm run server   # port 5000 — requires config.yml with Google credentials
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server with proxy config |
| `npm run build` | Production build → `dist/jukebox-aurora` |
| `npm test` | Karma/Jasmine unit tests |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run lint` | ESLint |
| `npm run server` | Legacy Express Google Music API proxy |

## Features

- Spotify library browsing (preview playback; full playback planned Phase 2)
- Google Play Music integration via local proxy (deprecated provider)
- 3D perspective carousel with hover-to-scroll
- Animated jukebox player with aurora border lighting
- Fullscreen mode
- Provider switching (Spotify / Google Play)

## Planned (see MODERNIZATION_LOG.md)

- Spotify PKCE auth + Web Playback SDK
- iTunes / Apple Music search
- Component architecture refactor
- Secure backend token storage
- Deployment to Render

## Version history

| Version | Notes |
|---------|-------|
| **1.1.0** | Phase 1 modernization — Angular 19, HttpClient, ESLint, Playwright |
| **1.0.0** | Original release — Angular 5, carousel, radio provider switching, fullscreen |

## License

MIT — see [LICENSE](LICENSE).
