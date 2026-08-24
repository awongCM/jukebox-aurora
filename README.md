# Jukebox Aurora

Jukebox Music Playing App — browse your music collection from cloud APIs on a colourful, animated jukebox with aurora lighting.

![Animated Jukebox](jukebox-animated.gif)

> **Modernization in progress.** This app originated as an Angular 4/5 pet project (~2017–2018). Phase 1 (June 2025) brought the toolchain up to current standards. See **[MODERNIZATION_LOG.md](MODERNIZATION_LOG.md)** for the full history of why and how we are modernizing.

## Quick start

**Requirements:** Node.js 20 or later.

```bash
npm install
cp .env.example .env
# Add SPOTIFY_CLIENT_ID to .env (see Configuration below)

npm start
```

Open [http://127.0.0.1:4200](http://127.0.0.1:4200) — use this address, not `localhost` (Spotify requires loopback IP for local redirects).

`npm start` runs `scripts/generate-environment.js`, which creates a gitignored `src/environments/environment.ts` from your `.env` file.

## Configuration (GitHub Secrets & Variables)

Credentials are **not stored in git**. Use [GitHub Secrets and variables](https://docs.github.com/en/actions/security-for-github-actions/about-secrets-and-variables) for CI, and a local `.env` file for development on your MacBook.

> GitHub Secrets are available to **GitHub Actions** — they are not pushed to your laptop automatically. For local `npm start`, mirror the same values in `.env` (gitignored).

### 1. Add to GitHub (repo → Settings → Secrets and variables → Actions)

| Name | Type | Example | Required |
|------|------|---------|----------|
| `SPOTIFY_CLIENT_ID` | **Secret** | your Spotify client ID | Yes (for Spotify login) |
| `SPOTIFY_REDIRECT_URI` | **Variable** | `http://127.0.0.1:4200` | Recommended |
| `GOOGLE_MUSIC_API_BASE_URL` | **Variable** | `http://localhost:5000/api` | Optional |

> **Note:** For single-page apps, the Spotify Client ID is embedded in the compiled JavaScript bundle at build time — that is normal for OAuth public clients using PKCE. GitHub Secrets keep it out of git history, not out of the browser. Never put a Spotify **client secret** in this app.

See GitHub’s guide: [Storing your secrets safely](https://docs.github.com/en/get-started/learning-to-code/storing-your-secrets-safely).

### 2. Local development (`.env`)

```bash
cp .env.example .env
```

Edit `.env`:

```env
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4200
```

Then run `npm start` (or `npm run env:generate` manually).

### 3. Spotify Developer Dashboard

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → your app → **Settings**
2. Add Redirect URI: `http://127.0.0.1:4200`
3. Use the same Client ID in GitHub Secret **and** local `.env`

After Phase 2, Spotify login requests extra scopes for Web Playback SDK streaming. **Log out and log in again** if you still have a session from before this change; token refresh cannot add new scopes. Full-track playback requires Spotify Premium.

### Cursor Cloud Agents

Cloud config: [`.cursor/environment.json`](.cursor/environment.json). Set `SPOTIFY_CLIENT_ID` in Cursor Cloud Secrets if agents need Spotify access. See [AGENTS.md](AGENTS.md).

### Optional: legacy Google Play Music proxy

Google Play Music was discontinued in 2020. The Express backend remains for reference only.

```bash
npm run server   # port 5000 — requires config.yml with Google credentials
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run env:generate` | Build `environment.ts` from `.env` / environment variables |
| `npm start` | Generate env + dev server on `127.0.0.1:4200` |
| `npm run build` | Generate env + production build → `dist/jukebox-aurora` |
| `npm test` | Karma/Jasmine unit tests |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run lint` | ESLint |
| `npm run server` | Legacy Express Google Music API proxy |

## CI

GitHub Actions workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) reads repository Secrets/Variables, generates `environment.ts`, then runs lint, build, and tests.

## Features

- Spotify library browsing (full-track playback via Web Playback SDK for Premium users; preview fallback)
- iTunes Search integration (30-second preview playback, no auth required)
- 3D perspective carousel with hover-to-scroll
- Animated jukebox player with aurora border lighting
- Fullscreen mode
- Provider switching (Spotify / iTunes)

## Planned (see MODERNIZATION_LOG.md)

**Phase 2 (complete for planned providers):** SoundCloud remains out of scope (blocked by original API constraints)

**Phase 3:** Component architecture refactor (`MusicAPIInterface` strategy)

**Phase 4:** UI polish — Web Audio, responsive layout, accessibility

**Phase 5:** Secure backend token exchange; Render deployment

## Version history

| Version | Notes |
|---------|-------|
| **1.2.0** | Phase 2 music APIs — token refresh, Web Playback SDK, iTunes search |
| **1.1.0** | Phase 1 modernization — Angular 19, HttpClient, ESLint, Playwright |
| **1.0.0** | Original release — Angular 5, carousel, radio provider switching, fullscreen |

## License

MIT — see [LICENSE](LICENSE).
