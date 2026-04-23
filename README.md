# 💀 Democracy++

[![Build Status](https://github.com/adamlassiter/democracy-plusplus/actions/workflows/main.yml/badge.svg)](https://github.com/adamlassiter/democracy-plusplus/actions)

> “For liberty! For Managed Democracy! For Super Earth!”

**Democracy++** is a *Helldivers 2* companion web app that dares to push the frontiers of freedom itself.  
Earn credits for your heroic service, spend them on stratagems and weaponry, and survive the ever-rising tide of galactic oppression - one procedurally intensifying challenge at a time.

👉 [**Helldivers to Hellpods**](https://adamlassiter.github.io/democracy-plusplus/) and do your part, soldier.

## 🌍 Mission Briefing

Democracy++ is a metagame built for Helldivers who crave **order**, **structure**, and **painful fairness**.  
It introduces a **quest, challenge & shop** system to the Helldivers 2 experience, letting players earn, spend, and suffer in glorious liberation.

While lesser recruits may settle for [helldivers2challenges.com](https://helldivers2challenges.com/), *true patriots* know that balance and challenge are the twin engines of liberty.  
Democracy++ refines that formula - more depth, more math, and more ways to prove your devotion to Super Earth.

## ⚙️ Super-Tech Specs

- **Language:** TypeScript
- **Framework:** React (with Redux)
- **UI Arsenal:** Material UI (MUI)
- **Build Tool:** Vite
- **Runtime:** Node.js / Browser
- **Networking:** Express

Optimized for rapid deployment and minimal downtime - because bugs are a form of treason.

## 🚀 Frontend Boot Sequence

The frontend lives in `apps/democracy-plusplus`.

Run it locally with:

```sh
npm run dev:frontend
```

By default the frontend listens on `http://localhost:5173`.

Available frontend environment variables:

- `VITE_BASE_PATH` - base path used for the built frontend

The frontend uses this backend for:

- lobby creation and join requests
- server-sent event lobby snapshots
- lobby presence polling and command updates

If `VITE_DEV` is set in development, multiplayer assumes `http://localhost:8080` for the backend.
In production, multiplayer assumes `https://bureaucracy-plusplus.lassiter.uk`
If the backend is unavailable, the app falls back to singleplayer mode.

## 🛰️ Backend Operations

The multiplayer lobby service lives in `apps/bureaucracy-plusplus`.

Run it locally with:

```sh
npm run dev:backend
```

By default the backend listens on `http://localhost:8080`.

You can also override the backend port:

```sh
PORT=9090 npm run dev:backend
```

Available backend environment variables:

- `PORT` - http port for the backend server. default: `8080`
- `DEV_ALLOWED_ORIGINS` - comma-separated list of extra allowed dev origins
- `ROOT_DOMAIN` - production root domain used for CORS validation
- `ALLOW_APEX_DOMAIN` - set to `true` to allow the apex `ROOT_DOMAIN`
- `EMPTY_LOBBY_TTL_MS` - how long empty lobbies are kept before cleanup
- `SESSION_TTL_MS` - authenticated session lifetime
- `PRESENCE_TTL_MS` - how long a player may go without polling before being treated as disconnected
- `LOBBY_CLEANUP_INTERVAL_MS` - cleanup timer interval

## 🔄 Data Intelligence Updates

After *Helldivers 2* receives an update from **Super Earth Command**, refresh your local intel using the **Data Enricher Protocol** found in `scripts/dataEnricher.ts`.  
This script pulls the latest strategic data from the Helldivers 2 Wiki - ensuring your democracy remains up to date.

## 🧩 Project Structure (Command Layout)

- `src/constants/` - Immutable truths of democracy, and the contents of your armory
- `src/economics/` - Credit system, pricing, and balance equations
- `src/slices/` - Redux state - maintaining order, discipline, and beureaucratic excellence
- `src/menu/` - User interface - where the freedom happens

## 💬 Contributing to the Cause

Freedom thrives on collaboration.
If you have ideas, bug fixes, or new stratagems to suggest, submit an Issue or Pull Request.

Automated tests are socialist propaganda.
Manual testing by loyal citizens is the current standard of excellence.

## 🪖 Credits

- Inspired by **Helldivers 2**, property of *Arrowhead Game Studios*  
- Developed by [Adam Lassiter](https://github.com/adamlassiter)  
- Supervised by **Super Earth Command**, in spirit  

## 📜 License

Licensed under the **MIT License** - the most liberating of open-source doctrines.  
See [LICENSE](./LICENSE) for full terms of your civic duty.

Stay vigilant, Helldiver - and remember: **freedom isn’t free, but this app is.**
