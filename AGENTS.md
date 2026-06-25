# Agent instructions — Jukebox Aurora

## Cursor Cloud specific instructions

- **Node:** 20 or later (`node -v`). Required by `package.json` engines.
- **Install:** Cloud agents run the `install` script from `.cursor/environment.json` (`npm install` plus a copy of `environment.example.ts` if `environment.ts` is missing).
- **Dev server:** `npm start` serves the app at [http://127.0.0.1:4200](http://127.0.0.1:4200). Use `127.0.0.1`, not `localhost` — Spotify redirect URIs require the loopback IP.
- **Verify before large changes:** `npm run build && npm run lint`
- **Unit tests:** `npm test -- --no-watch --browsers=ChromeHeadless` (may need Chrome in the VM; not part of default `install`).
- **Secrets:** Do not commit Spotify client IDs or other API keys. Add `SPOTIFY_CLIENT_ID` via Cursor Cloud Secrets if needed; keep values in `src/environments/environment.ts` locally (gitignored override) or inject at runtime — never in committed source.
- **Spotify OAuth:** Full login flow is intended for local browser testing with redirect URI `http://127.0.0.1:4200`. Cloud agents should focus on build, lint, and UI/code changes unless secrets and redirect are explicitly configured.
- **Legacy Google Music proxy:** Optional `npm run server` on port 5000; requires `config.yml` (gitignored). Not started by default in cloud terminals.

## Project context

- Angular 19 standalone app; modernization history in [MODERNIZATION_LOG.md](MODERNIZATION_LOG.md).
- Branch naming for agent work: `cursor/<descriptive-name>-5398`.
