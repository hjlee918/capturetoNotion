# capturetoNotion — Milestones

**Last updated:** 2026-05-02
**Repo:** https://github.com/hjlee918/capturetoNotion

This document tracks what has shipped in each milestone branch, what was tested, and what remains open. Read `PROJECT_STATUS.md` for the full roadmap.

---

## Milestone A — Cleanup + Internal Token Auth

**Branch:** `phase-1-cleanup` (merged to `main`)  
**Follow-up branch:** `phase-2-internal-token` (merged to `main`)  
**Goal:** Fix the broken build pipeline, establish real auth, and eliminate dead code.

### Commits (main)

| Commit | Message |
|---|---|
| `8d26809` | Add esbuild and update build script to compile background + content scripts |
| `2f8ec1f` | Add host_permissions, content_scripts, and identity permission to manifest |
| `a1699e1` | Wire GET_FORMS, GET_HISTORY, GET_SETTINGS to chrome.storage.local |
| `69e1fa7` | Remove dead code: plain JS background stub, empty router, empty index files, unused tsconfig.extension.json |
| `d741605` | Add internal-token auth module: verify, save, get, clear token |
| `62a129a` | Wire popup to internal token flow: paste, verify, show user, disconnect |

### What changed

| Area | Before | After |
|---|---|---|
| Build pipeline | Vite built popup/options only; `background.js` and `content.js` were dead code or plain-JS stubs copied manually | Vite builds popup/options; esbuild bundles `src/background/index.ts` → `dist/background.js` and `src/content/index.ts` → `dist/content.js` |
| Auth | `AUTH_CONNECT` returned hardcoded `connected@stub.local` | Real internal-integration token flow: paste `secret_...` or `ntn_...` token, verify against `/v1/users/me`, store `{ token, user_name, user_email, connected_at }` in `chrome.storage.local` |
| Manifest | Missing `host_permissions`, `content_scripts`, `identity` | Has `host_permissions: ["https://api.notion.com/*"]`, `content_scripts` on `<all_urls>`, `identity` for future OAuth |
| Dead code | `background.js`, `src/background/router.ts`, `src/index.ts`, `src/index.js`, `tsconfig.extension.json` | Deleted |
| Popup UI | Single "Connect Notion" button that faked success | Password input for token, "Connect" button with validation, shows `user_name` + "Disconnect" button when connected |

### Test results

- [x] `npm run typecheck` passes
- [x] `npm run build` produces clean `dist/` with all expected files
- [x] Extension loads unpacked in Chrome with no console errors
- [x] Paste valid Notion internal token → verifies, stores, shows connected state
- [x] Disconnect clears token and returns to input screen
- [x] Reopen popup after connection → shows connected state immediately
- [x] Invalid token → shows error inline

---

## Milestone B — Database Picker + First Real Page Save

**Branch:** `milestone-b` (merged to `main`)  
**Goal:** Prove the end-to-end pipeline: list databases, pick one, save the active tab as a Notion page.

### Commits (main)

| Commit | Message |
|---|---|
| `c6799b4` | Add Notion API client, database lister, and page creator with schema inspection |
| `9d55d2a` | Add LIST_DATABASES, SET/GET_SELECTED_DATABASE, and CREATE_PAGE message handlers |
| `78f43c3` | Add database picker and save-page button to popup UI |

### What changed

| Area | Before | After |
|---|---|---|
| Notion API client | None | `src/background/notion/client.ts` — thin wrapper handling `Authorization: Bearer`, `Notion-Version: 2022-06-28`, error normalization |
| Database listing | None | `LIST_DATABASES` calls `/v1/search` with `filter: { value: "database", property: "object" }`; popup renders dropdown |
| Database selection | None | Selected DB ID persisted in `chrome.storage.local` under `selected_database`; survives popup close |
| Page creation | Title + URL only | Inspects DB schema to find title property name (not always "Name"), creates page with title + URL mapped to correct properties |
| Popup UI | Connect + disconnect only | After connection: shows database dropdown, "Save this page" button, opens created Notion page in new tab on success |

### Test results

- [x] Connected as `CaputureNT`, picked `NOTION INBOX` from dropdown
- [x] "Save this page" on a YouTube video → created entry with title, URL, and created-time
- [x] New Notion page opened automatically in a new tab
- [x] Database selection persisted across popup reopen
- [x] Refresh button re-fetches database list
- [x] Disconnect/reconnect cycle works

---

## Milestone C — Content Extraction + Context Menu + Site Extractors

**Branch:** `milestone-c-extraction` (merged to `main`)  
**Goal:** Replace the naive "tab title + URL" save with real page extraction and add right-click saving.

### Commits (main)

| Commit | Message |
|---|---|
| `3173517` | Add content extraction system: generic extractor, hostname registry, EXTRACT_PAGE dispatcher |
| `b14ce4e` | Extend createPage with schema-aware property mapping, cover, icon, and callout blocks |
| `10f6101` | Wire EXTRACT_AND_SAVE flow: background extracts from content script then creates Notion page |
| `35d1d24` | Add right-click context menu: Save page and Save selection to Notion |
| `c485521` | Add site-specific extractors for YouTube, GitHub, and Twitter/X |
| `d86e1f9` | Fix extension load: add contextMenus permission and guard against duplicate menu items |
| `fc4fd19` | Guard all chrome.contextMenus usage to prevent crash when permission not yet granted |
| `dc3e4ae` | Fix notification icons: use real icon.png, add logging, wrap in try/catch |

### What changed

| Area | Before | After |
|---|---|---|
| Content extraction | None (tab title + URL only) | `src/content/extractors/generic.ts` pulls og:title, og:description, og:site_name, og:image, favicon, author, published_time, and current selection. `src/content/extractors/index.ts` is a hostname registry. |
| Site extractors | None | YouTube (channel, duration, thumbnail, title cleanup), GitHub (repo stars/language, file path, issue/PR state + labels), Twitter/X (tweet text, handle, likes, retweets, thread detection) |
| Schema mapping | Title + URL only | Maps description → rich_text "Description"/"Summary"/"Notes", author → "Author", site_name → "Source"/"Site", image → files "Image"/"Cover", published_time → date "Published"/"Date". Sets page cover and icon. Prepends selection as callout block. |
| Save flow | Popup sends `CREATE_PAGE` with tab data | Popup sends `EXTRACT_AND_SAVE`; background asks content script for `ExtractedPage`, then creates page with full data |
| Context menu | None | Two items: "Save page to Notion" (page context) and "Save selection to Notion" (selection context). Triggers same `EXTRACT_AND_SAVE` flow. Shows toast notification on success/failure. |
| Manifest permissions | storage, activeTab, identity, notifications | Added `contextMenus` |

### ExtractedPage type

```typescript
export type ExtractedPage = {
  title: string;
  url: string;
  description?: string;
  author?: string;
  site_name?: string;
  favicon?: string;
  image?: string;
  published_time?: string;
  selection?: string;
  extras?: Record<string, string | number | boolean | undefined>;
};
```

### Test results

| # | Test | Result |
|---|---|---|
| 1 | Generic page save (og meta + selection) | ✅ Pass |
| 2 | YouTube save (channel, duration, thumbnail) | ✅ Pass |
| 3 | GitHub save (stars, language, issue labels) | ✅ Pass |
| 4 | Twitter/X save (tweet text, handle, likes) | ✅ Pass |
| 5 | Right-click "Save page" | ✅ Pass, success toast appears |
| 6 | Right-click "Save selection" | ✅ Pass, selection appears as callout block |
| 7 | No save target notification (no DB selected) | ✅ Pass after fix — shows "Save failed: Not authenticated" when disconnected, or "No save target" when no DB selected |

### Known issues resolved during milestone

1. **Extension failed to load** — `chrome.contextMenus` permission missing from manifest. Fixed by adding `"contextMenus"` to permissions array.
2. **Duplicate menu item error on update** — `chrome.contextMenus.create` throws if ID exists. Fixed by wrapping in `removeAll(() => create(...))`.
3. **Notifications silently failed** — 1×1 transparent PNG data URL rejected by Chrome. Fixed by generating a real `48×48` PNG (`public/icon.png`) and using `chrome.runtime.getURL('icon.png')`.

---

## What's next

The next major milestone is **Form Templates** (see `PROJECT_STATUS.md` section 2, item 4). This will add:

- Per-database form definitions saved locally
- Property mapping UI in the popup
- Up to 4 forms per database (free tier of reference product)
- Dynamic input rendering per Notion property type

Start a fresh Claude Code session for this work — the architecture is stable enough that a new context window is appropriate.
