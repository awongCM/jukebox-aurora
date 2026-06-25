# Jukebox Aurora — Modernization History Log

This document records **why** and **how** Jukebox Aurora is being modernized. It is a living history log intended for future contributors (including past-you) who want to understand decisions without re-reading years of context.

---

## Project origin (circa 2017–2018)

Jukebox Aurora started as a personal learning project:

- Angular 4/5 single-page app
- Colourful aurora background and animated jukebox UI
- 3D perspective carousel for browsing tracks
- Integration with **Spotify** and **Google Play Music** via web APIs
- Express proxy backend for unofficial Google Play Music access (`playmusic` npm package)

The README captured honest scope: Spotify and Google Play were partially integrated; iTunes and SoundCloud were planned; component extraction and security were TODOs. Life got busy — the app was left in a working-but-unfinished prototype state.

---

## Why modernization is necessary (2025)

### 1. The toolchain is end-of-life

| Legacy (2018) | Problem today | Phase 1 target |
|---------------|---------------|----------------|
| Angular 5 | 8+ major versions behind; no security patches | **Angular 19** |
| `@angular/http` | Removed after Angular 5 | **`HttpClient`** (`@angular/common/http`) |
| RxJS 5 (`rxjs/add/operator/map`) | Deprecated import style | **RxJS 7** pipeable operators |
| TypeScript 2.4 | Cannot type-check modern code | **TypeScript 5.7** |
| Node 8.9 | EOL, unsafe, won't run modern tooling | **Node 20+** |
| TSLint | Unmaintained since 2019 | **ESLint** + `angular-eslint` |
| Protractor | Officially deprecated by Angular team | **Playwright** |
| `.angular-cli.json` | Replaced years ago | **`angular.json`** (CLI v6+ format) |
| `platformBrowserDynamic` + `NgModule` bootstrap | Legacy pattern | **`bootstrapApplication`** + standalone components |

**Decision:** Rebuild the project shell on current Angular defaults rather than attempting 14 sequential `ng update` hops from v5. The app is small (~35 source files); a controlled migration preserves behaviour while replacing infrastructure.

### 2. Music APIs changed underneath the app

- **Spotify** deprecated the implicit OAuth grant; PKCE is required for new apps (Phase 2).
- **Google Play Music** shut down in 2020. The `playmusic` backend remains for historical reference but is not a viable long-term provider (Phase 2: Apple Music, YouTube Music, or local files).
- **Secrets were hardcoded** in `spotify-api.service.ts` (client ID *and* client secret). Client secrets must never ship in frontend code.

**Decision (Phase 1):** Move configuration to `environment.ts` / `environment.example.ts`. Remove `client_secret` from the frontend entirely. Document that Spotify login still uses the legacy implicit flow temporarily — PKCE migration is explicitly Phase 2.

### 3. Architecture was started but not finished

Scaffolded components (`JukeboxPlayerComponent`, `PlaylistCarouselComponent`, etc.) were never wired up; all logic lived in `AppComponent`. A `MusicAPIInterface` was defined but not implemented.

**Decision (Phase 1):** Convert all components to **standalone** (Angular's current default) and `providedIn: 'root'` services. Keep the monolithic `AppComponent` layout for now to minimise behavioural risk. Component extraction remains Phase 3.

### 4. Known bugs fixed during migration

| Bug | Fix |
|-----|-----|
| Radio buttons compared against undefined `SPM`/`GPM` identifiers | Compare against string literals `'SPM'` / `'GPM'` |
| Spotify track `id` mapped from `track_number` | Use `track.id` |
| `setTimeout` callback lost `this` context for disc animation reset | Arrow function + null guard |
| `server.js` declared `const MASTER_TOKEN` then reassigned | Changed to `let masterToken` |

---

## Phase 1 — What was implemented

### Framework & build

- [x] Angular 19 with `application` builder
- [x] Standalone `AppComponent` bootstrapped via `bootstrapApplication`
- [x] `provideHttpClient()` for HTTP
- [x] Strict TypeScript (`strict: true`)
- [x] `angular.json` replacing `.angular-cli.json`
- [x] `public/` asset folder (Angular 19 convention)

### HTTP & services

- [x] `SpotifyAPIService` migrated to `HttpClient` + `inject()`
- [x] `GooglePlayMusicAPIService` migrated to `HttpClient` + environment-based base URL
- [x] `ItunesMusicSearchAPIService` stub simplified (Phase 2 implementation)
- [x] `ScriptService` typed and uses `providedIn: 'root'`

### Configuration & security

- [x] `environment.ts` / `environment.prod.ts` for Spotify client ID and API URLs
- [x] `environment.example.ts` as a safe template (no secrets committed)
- [x] Removed hardcoded Spotify client secret from source

### Tooling

- [x] ESLint flat config (`eslint.config.js`) with `angular-eslint`
- [x] Playwright replaces Protractor (`e2e/app.spec.ts`, `playwright.config.ts`)
- [x] Karma/Jasmine updated for Angular 19 unit tests (7 specs; uses Angular CLI default Karma config)
- [x] `engines.node >= 20` in `package.json`

### Preserved intentionally (not Phase 1 scope)

- Aurora CSS animations and jukebox visual design
- 3D carousel interaction model
- HTML5 `<audio>` playback (preview URLs for Spotify)
- Spotify Web Playback SDK script loader (wiring deferred to Phase 2)
- Express `server.js` Google Music proxy (legacy; documented as deprecated provider)
- Monolithic `AppComponent` template structure

---

## Phase roadmap (future entries)

| Phase | Focus | Status |
|-------|-------|--------|
| **1** | Toolchain, HttpClient, standalone bootstrap, env config, lint/e2e | **Complete** |
| **2** | Spotify PKCE + Web Playback SDK; replace Google Play; iTunes search | Planned |
| **3** | Extract carousel/player/button components; `MusicAPIInterface` strategy | Planned |
| **4** | UI polish — Web Audio visualizations, responsive layout, CSS modernization | Planned |
| **5** | Secure backend token exchange; Render deployment | Planned |

---

## How to run after Phase 1

```bash
# Requires Node 20+
npm install
cp src/environments/environment.example.ts src/environments/environment.ts
# Edit environment.ts with your Spotify client ID

npm start          # Angular dev server on http://127.0.0.1:4200
npm run server     # Legacy Google Music proxy on :5000 (optional)
npm test           # Karma unit tests
npm run e2e        # Playwright (starts dev server automatically)
npm run lint       # ESLint
npm run build      # Production build → dist/jukebox-aurora
```

### Cursor Cloud Agents

Repo-level cloud environment config lives in [`.cursor/environment.json`](.cursor/environment.json). Agent-specific setup notes are in [AGENTS.md](AGENTS.md).

---

## Changelog

### 2025-06-22 — Spotify PKCE auth fix

- Migrated Spotify login from deprecated implicit grant (`response_type=token`) to **Authorization Code + PKCE**
- Changed redirect URI from `http://localhost:4200` to **`http://127.0.0.1:4200`** (Spotify security requirement)
- Removed broken `proxy.config.json` that proxied all traffic to `accounts.spotify.com`
- Dev server now binds to `127.0.0.1` via `ng serve --host 127.0.0.1`

### 2025-06-22 — Phase 1 foundation

- Migrated Angular 5 → 19, Node 8 → 20+, TypeScript 2.4 → 5.7
- Replaced `@angular/http`, TSLint, Protractor, NgModule bootstrap
- Environment-based config; removed committed API secrets
- Fixed radio binding, track ID mapping, disc animation, server token bug
- Mocked `ScriptService` in unit tests to avoid loading external Spotify SDK
- Added this modernization history log

---

*This file should be updated at the end of each modernization phase.*
