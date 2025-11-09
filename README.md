
# ARC Raiders Explorer (Astro + React + Tailwind + Netlify Functions)

A minimal, deploy-ready project that explores ARC Raiders game data via the community MetaForge API — using a Netlify serverless function to avoid CORS issues.

## 🧰 Tech
- Astro + React
- Tailwind CSS
- Netlify Functions (serverless CORS proxy)
- TypeScript

## ▶️ Run locally

```bash
npm install
npm run dev
```

Open http://localhost:4321

## 🚀 Deploy to Netlify

1. Push this folder to a new Git repo (GitHub/GitLab/Bitbucket).
2. In Netlify, **New site from Git** → pick your repo.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Functions directory: `netlify/functions`

The provided `netlify.toml` already sets a redirect so that frontend calls to `/api/*` route to the function.

## 🔌 API usage

The React component fetches from these endpoints via the proxy (so you write just `/api/...`):

- `/api/arc-raiders/items`
- `/api/arc-raiders/arcs`
- `/api/arc-raiders/quests`
- `/api/arc-raiders/traders`
- `/api/game-map-data` (optional `?map=Dam` etc.)

The function relays to `https://metaforge.app/*` and adds `Access-Control-Allow-Origin: *`.

## ⚠️ Notes

- The MetaForge API is community-maintained; schemas may change. The UI falls back to raw JSON when fields are unknown.
- If you need SSR or API routes in Astro later, you can add adapters. For this simple static site + functions, the default build works well on Netlify.
