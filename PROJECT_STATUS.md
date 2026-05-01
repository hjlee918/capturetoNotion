# capturetoNotion — Project Status & Roadmap

**Last reviewed:** 2026-05-01
**Reference product:** https://savetonotion.so/
**Repo:** https://github.com/hjlee918/capturetoNotion

This document is the handoff brief from Codex → Claude Code CLI.
Read this first before making changes.

---

## 1. What's actually built (state of `main`, 6 commits in)

The project is a **scaffold**, not a working clipper. Concretely:

### Working
- Chrome MV3 extension loads without errors (per last commit message: "Fix extension load errors and working baseline").
- Vite 6 + React 19 + TypeScript 5.8 build pipeline for popup and options pages.
- Popup renders a single "Connect Notion" button.
- Background service worker (`background.js`, plain JS) responds to one message type with a hardcoded stub.

### File-by-file
| File | Purpose | State |
|---|---|---|
| `manifest.json` | MV3 manifest, perms: `storage`, `activeTab` | ✅ loads, but missing `host_permissions` and `content_scripts` |
| `background.js` | Service worker actually shipped | Stub: returns fake `connected@stub.local` for `AUTH_CONNECT` |
| `src/background/index.ts` | TS router with typed stubs for AUTH_CONNECT, GET_FORMS, GET_HISTORY, GET_SETTINGS | ⚠️ **Not wired to the build** — duplicate of `background.js` and currently dead code |
| `src/background/router.ts` | Empty placeholder | Stub |
| `src/content/index.ts` | Listener for `GET_CAPTURE_SESSION` returning page URL/title | ⚠️ **Not registered in manifest**, so never injected |
| `src/popup/main.tsx` | React popup with one button | UI placeholder |
| `src/options/main.tsx` | React options page | "Starter options scaffold is ready" placeholder |
| `src/index.ts`, `src/index.js` | `export {}` | Empty |
| `vite.config.ts` | Builds popup + options HTML entries | ⚠️ Doesn't build background or content scripts |
| `package.json` | Build script copies `manifest.json` and `background.js` into `dist/` | Brittle — manifest and background bypass Vite |

### Notion integration status
**Zero.** No OAuth flow, no API client, no token storage, no DB schema fetching, no page creation. The `AUTH_CONNECT` message returns a hardcoded fake email.

---

## 2. Target scope (mirroring Save to Notion)

Save to Notion's feature set, in roughly the order to build them:

1. **Notion OAuth** — real auth flow, token in `chrome.storage.local`, account display in popup.
2. **Database picker + schema fetch** — list user's accessible DBs, fetch property schema (title, rich_text, select, multi_select, relation, checkbox, date, url, number, etc.).
3. **Basic page capture** — content script extracts URL, title, OG meta, author, favicon, current selection. Background creates a Notion page.
4. **Form templates** — per-DB form definitions saved locally; map page-data fields to DB properties; up to 4 forms (free tier of reference).
5. **Dynamic property UI in popup** — render correct input per Notion property type, submit to Notion API.
6. **Screenshots & image picker** — `chrome.tabs.captureVisibleTab`, plus extract `<img>` candidates from page; upload to Notion.
7. **Highlights** — content-script selection capture → callout/quote/toggle blocks.
8. **Auto-extraction rules** — per-site enrichers (YouTube, Twitter, LinkedIn, Gmail, recipes).
9. **History view** — local log of saved pages.
10. **Settings page** — the shape is already in `src/background/index.ts`'s `GET_SETTINGS` stub: `openNotionInDesktopApp`, `showSaveButtonsOnWebsites`, `rememberHighlights`, `hideContextMenuOption`, `embeddedPostFormat`. Build the actual UI + persistence.
11. **Polish** — icons, screenshots, privacy policy, Chrome Web Store submission.

---

## 3. Immediate cleanup before any feature work

Do these first — they're cheap and unblock everything else.

1. **Pick one background worker.** Either delete `src/background/index.ts` and keep `background.js`, OR update the build to compile `src/background/index.ts` → `dist/background.js` and stop copying the hand-written JS. Right now they're out of sync and only the JS stub runs.
2. **Register `src/content/index.ts` in `manifest.json`** under `content_scripts` (with a sensible `matches` pattern) so the file actually gets injected.
3. **Add `host_permissions: ["https://api.notion.com/*"]`** to the manifest — required for any real Notion API call.
4. **Consider `@crxjs/vite-plugin`** so manifest, popup, options, background, and content all flow through one build. The current "vite + manual cp" setup will keep causing drift.
5. **Wire `GET_FORMS`, `GET_HISTORY`, `GET_SETTINGS` to real `chrome.storage.local`** instead of returning empty/stub objects, even before the UI exists. Establishes the data layer.

---

## 4. Suggested architecture

```
src/
  background/
    index.ts           ← service worker entry, message router only
    notion/
      auth.ts          ← OAuth flow, token refresh
      client.ts        ← thin Notion API wrapper
      databases.ts     ← list DBs, fetch schema
      pages.ts         ← create page from form data
    storage/
      forms.ts         ← form template CRUD
      history.ts       ← saved-page log
      settings.ts      ← user prefs
  content/
    index.ts           ← listener: extract page meta + selection
    extractors/
      generic.ts
      youtube.ts
      twitter.ts
      ...
  popup/
    main.tsx
    components/
      ConnectScreen.tsx
      DatabasePicker.tsx
      DynamicForm.tsx       ← renders inputs by Notion property type
      Screenshotter.tsx
  options/
    main.tsx
    components/
      FormEditor.tsx
      SettingsPanel.tsx
      HistoryList.tsx
  shared/
    messages.ts        ← typed message contracts (single source of truth)
    notion-types.ts
```

---

## 5. Known gotchas

- **MV3 service workers go idle.** Don't hold state in module scope; persist to `chrome.storage`.
- **Notion OAuth in extensions** — use `chrome.identity.launchWebAuthFlow` with a redirect to your OAuth proxy (Notion doesn't allow `chrome-extension://` redirects directly). You'll need a tiny server-side endpoint to exchange the code, OR use Notion's "internal integration" token model and ask the user to paste a token (simpler but worse UX).
- **React 19 + Vite 6** are recent — if you hit weird build issues, check version compat first.
- **The `dist/` directory is gitignored** (per commit `2442eb9`); always rebuild before loading unpacked.

---

## 6. Suggested next milestone

Pick ONE of these as the next sprint, not both:

- **Milestone A — Real auth + DB list** (foundation): OAuth, store token, list databases in popup, pick one and persist it. No saving yet. ~1-2 sessions.
- **Milestone B — End-to-end stub-to-Notion** (vertical slice): keep auth as a manually-pasted internal-integration token, but actually create a Notion page from the popup with title + URL. Proves the pipeline. ~1 session.

Recommendation: **Milestone B first**. Vertical slice gives you a working extension faster and validates the Notion API setup before investing in OAuth plumbing.
