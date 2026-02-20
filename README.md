# SapaTracker

Student-focused personal finance app (web + Capacitor Android/iOS) with:

- Dashboard, budgeting, subscriptions, house shopping, profile sync
- SAPA A.I chat assistant with free local mode and optional premium cloud mode
- Firebase Auth + Firestore per-user data isolation

## Environment setup

1. Copy `.env.example` to `.env`.
2. Fill your Firebase app values.
3. Keep `.env` local only (it is git-ignored).

## SAPA A.I modes

- Free mode (default): local deterministic coaching, no OpenAI cost.
- Premium mode: backend route calls OpenAI and uses live app data context.

Frontend variables:

- `VITE_SAPA_AI_PREMIUM_ENABLED=false|true`
- `VITE_OPENAI_ENDPOINT=http://localhost:8787/api/sapa-ai`
- `VITE_OPENAI_MODEL=gpt-5-mini`

Backend-only variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)
- `FIREBASE_WEB_API_KEY`
- `AI_BACKEND_ALLOW_ORIGINS` (comma-separated, no wildcard in prod)
- `AI_BACKEND_RATE_LIMIT_MAX` (default 30)
- `AI_BACKEND_RATE_LIMIT_WINDOW_MS` (default 60000)

## Security defaults

- Firestore rules allow users to access only `users/{uid}` and its subcollections.
- AI backend now enforces:
  - Firebase ID token verification (`Authorization: Bearer <idToken>`)
  - rate limiting per user + IP
  - restricted CORS allowlist
  - body size and request bounds
  - no-cache and hardening headers
- OpenAI key stays backend-only.

## Local run

1. Terminal A:
   - `npm run ai:dev`
2. Terminal B:
   - `npm run dev`
3. Health check:
   - `http://localhost:8787/health`

## Build

- Web build: `npm run build`
- Android sync: `npx cap sync android`
- Android APK (debug): `cd android && .\gradlew.bat assembleDebug`
