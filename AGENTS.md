# Agent instructions — Jukebox Aurora

## Cursor Cloud specific instructions

- **Node:** 20 or later (`node -v`). Required by `package.json` engines.
- **Install:** Cloud agents run `.cursor/environment.json` (`npm install` + `npm run env:generate`).
- **Dev server:** `npm start` → [http://127.0.0.1:4200](http://127.0.0.1:4200). Use `127.0.0.1`, not `localhost`.
- **Verify before large changes:** `npm run build && npm run lint`
- **Unit tests:** `npm test -- --no-watch --browsers=ChromeHeadless`
- **Secrets:** Never commit credentials. Configuration is injected via:
  - **GitHub Actions:** repository Secrets/Variables → `scripts/generate-environment.js`
  - **Local dev:** gitignored `.env` file (copy from `.env.example`)
  - **Cursor Cloud:** set `SPOTIFY_CLIENT_ID` in Cursor Cloud Secrets if needed
- **Spotify OAuth:** Redirect URI must be `http://127.0.0.1:4200`. Cloud agents should focus on build/lint/UI unless secrets are configured.

## Project context

- Angular 19 standalone app; modernization history in [MODERNIZATION_LOG.md](MODERNIZATION_LOG.md).
- Branch naming for agent work: `cursor/<descriptive-name>-5398`.
