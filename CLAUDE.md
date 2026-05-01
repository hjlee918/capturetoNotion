# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is a **Chrome Manifest V3 extension** called *Notion Capture*. It saves web content into Notion using template-driven forms. It is built with **Vite**, **React 19**, and **TypeScript**.

## Build, typecheck, and dev commands

```bash
npm install      # install dependencies
npm run dev      # start Vite dev server for HMR during UI development
npm run typecheck # run tsc --noEmit across src/
npm run build    # full production build (typecheck + vite build + copy statics into dist/)
```

There is no test runner configured yet. To run a single TypeScript file manually, use `npx tsx <path>` or `node --import tsx`.

## Extension architecture

### Entry points and build outputs

The extension has three runtime surfaces, but only two are actively built by Vite:

| Surface | Source | Build behavior |
|---|---|---|
| **Popup** | `popup.html` → `src/popup/main.tsx` | Built by Vite (`rollupOptions.input.popup`) |
| **Options page** | `options.html` → `src/options/main.tsx` | Built by Vite (`rollupOptions.input.options`) |
| **Background service worker** | `background.js` (plain JS in repo root) | **Copied** into `dist/` during build, **not compiled** |

Vite outputs everything to `dist/`. The `npm run build` script additionally copies `manifest.json` and `background.js` into `dist/` after the Vite build step.

### Typed background scripts (not yet wired into the build)

There is a parallel TypeScript background implementation under `src/background/`:

- `src/background/index.ts` — typed message handlers (`AUTH_CONNECT`, `GET_FORMS`, `GET_HISTORY`, `GET_SETTINGS`) returning `{ ok, data?, error? }`
- `src/background/router.ts` — unused boilerplate message router

`tsconfig.extension.json` targets compiling `src/background/**/*.ts` and `src/content/**/*.ts` into `dist/src/`, but the current build script does **not** invoke this step. The shipped service worker is still the plain JS `background.js` in the repo root.

### Content script

- `src/content/index.ts` — listens for `GET_CAPTURE_SESSION` and returns page metadata (`url`, `title`, `extractorVersion`, `extractedAt`).
- Not yet declared in `manifest.json` under `content_scripts`, so it is not injected automatically.

### Cross-context messaging convention

All messages sent via `chrome.runtime.sendMessage` use a consistent envelope shape:

```typescript
type ExtensionMessage = { type?: string };
type MessageResponse = { ok: boolean; data?: unknown; error?: string };
```

Background handlers are async and return `MessageResponse`. The listener in `src/background/index.ts` always returns `true` to keep the message channel open for async responses.

### Chrome types

`@types/chrome` is included. `tsconfig.json` adds `"types": ["chrome"]` so `chrome.runtime`, `chrome.storage`, etc. are available globally in `src/`.
