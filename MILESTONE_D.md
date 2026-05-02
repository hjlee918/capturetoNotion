# Milestone D — Form Templates

**Branch:** `milestone-d-forms` (planned)
**Status:** Spec — not yet started
**Depends on:** Milestone C (merged to `main` at `dc3e4ae`)
**Goal:** Let the user define reusable form templates per database, then capture pages by filling in a form whose fields are mapped to Notion properties — replacing the current one-shot "Save this page" with a deliberate, structured save.

This is the first UI-heavy milestone. The save pipeline (extraction, schema-aware property mapping, page creation) from Milestone C stays intact; Milestone D adds a layer in front of it that lets the user override and supply property values before the page is created.

---

## Scope

### In scope (v1)

- Form template data model persisted in `chrome.storage.local`
- Up to 4 form templates per database
- Form template editor (create, rename, edit fields, delete)
- Per-field config: Notion property binding, label, default value, hidden/locked, source mapping (which extracted field pre-fills it)
- Form picker UI when saving — popup lists templates for the selected database
- Form filler UI rendered in the **side panel** (not popup), pre-filled from extracted page data
- "Save" submits the filled form through the existing `createPage` path
- Property type renderers for: `title`, `rich_text`, `url`, `select`, `multi_select`, `date`, `checkbox`, `number`

### Deferred to later milestones

- `relation` (needs database search + multi-select UI)
- `people` (needs workspace user list endpoint and caching)
- `files` (upload pipeline is its own milestone)
- `status` (similar to select but with workflow semantics worth designing properly)
- `formula` / `rollup` (read-only; show as disabled if surfaced at all)
- Public OAuth (separate track — `phase-2-oauth`)
- Form sharing / export / import
- Conditional fields (show field B only if field A = X)

### Explicitly out of scope

- Editing existing Notion pages — Milestone D only creates new pages, same as C
- Bulk save (multiple tabs at once)
- Form analytics / save history (lives in `GET_HISTORY` already, no UI changes)

---

## Architectural decisions

| Decision | Choice | Rationale |
|---|---|---|
| Where to render the form | Chrome side panel (`chrome.sidePanel`) | Popup closes on focus loss, which breaks form-filling when the user clicks back to the page to copy something. Side panel persists, has more vertical space, and feels closer to a real capture tool. Popup is still used for picking which template to open. |
| Property binding key | Notion property **ID**, not name | Property names can be renamed in Notion; IDs are stable. Schema fetch already returns IDs. |
| Multiple templates per database | Yes, up to 4 | Matches the reference product's free tier. Users will want "quick save" vs "full article" within the first week of real use. |
| Template storage | `chrome.storage.local` keyed by `forms:{databaseId}` → array of templates | Matches existing storage convention. Keeps each DB's templates loadable independently. |
| Default value source | Either a literal string or a reference to an extracted field (`{{title}}`, `{{description}}`, `{{selection}}`, etc.) | Lets a template say "default the rich_text 'Notes' to the page selection" without baking extraction logic into the form layer. |
| Form filler entry points | Popup "Save" button (opens side panel), context menu (opens side panel directly) | Right-click should still trigger the form, not bypass it — otherwise the form is too easy to forget. A future preference can add a "skip form" toggle per template. |
| When no templates exist for a DB | Fall back to the current Milestone C behavior (auto-extract and save) | Keeps the extension usable without form setup. The popup shows a "+ New form" affordance. |

---

## Planned commits

These are the intended commits on `milestone-d-forms`. Each should pass `npm run typecheck && npm run build` before the next is started.

| # | Subject | Description |
|---|---|---|
| 1 | Add form template data model and storage | Define `FormTemplate` and `FormField` types. Add `forms.ts` storage module with CRUD: list, get, save, delete templates per database. Migration is a no-op (no existing key). |
| 2 | Add LIST_FORMS, GET_FORM, SAVE_FORM, DELETE_FORM message handlers | Background message handlers wrapping the storage module. Mirror the pattern from `LIST_DATABASES` / `SET_SELECTED_DATABASE`. |
| 3 | Add form template editor in options page | Options-page UI for creating and editing templates against the currently-selected database's schema. List of templates, "+ New", per-template field editor with property dropdown, label, default, hidden/locked toggles. |
| 4 | Wire side panel registration and host page | `manifest.json` adds `side_panel.default_path`. Add `src/sidepanel/` with React entry. Empty shell that reads a `target` from storage and renders "loading…". |
| 5 | Implement property type renderers | One component per supported type: `TitleField`, `RichTextField`, `UrlField`, `SelectField`, `MultiSelectField`, `DateField`, `CheckboxField`, `NumberField`. Each takes `{ field, value, onChange, schema }`. |
| 6 | Implement form filler in side panel | Loads template + extracted page data, renders fields, handles submit → `CREATE_PAGE` with mapped values. Shows success/error inline, closes panel on success. |
| 7 | Add template picker to popup and wire entry points | Popup shows templates for selected DB; clicking one stores `target` and opens side panel. Context menu items also store target and open side panel. Fallback to Milestone C behavior if no templates. |
| 8 | Polish, error states, and known-issue fixes | Loading skeletons, validation messages, schema-changed-since-template-saved warning, empty-state UI. |

**Work-breakdown note:** commits 4–6 are the heaviest. If commit 6 grows large, split into "form filler skeleton" and "submit pipeline" rather than letting it sprawl.

---

## What will change

| Area | Current (post-Milestone C) | Target (post-Milestone D) |
|---|---|---|
| Save trigger | Popup "Save this page" or right-click → immediate extract + create | Popup shows template picker for selected DB; clicking a template opens side panel pre-filled. Right-click triggers default template (or fallback if none). |
| Property mapping | Hardcoded heuristics: description → "Description"/"Summary"/"Notes", author → "Author", etc. | Template defines explicit binding from form field → Notion property ID. Heuristics still seed defaults when the user creates a new template. |
| Storage keys | `notion_token`, `selected_database`, plus history | Adds `forms:{databaseId}` → `FormTemplate[]`, and `pending_save_target` (transient, written by popup/context-menu, read by side panel) |
| Manifest | Permissions: `storage`, `activeTab`, `identity`, `notifications`, `contextMenus`. Host: `https://api.notion.com/*` | Adds `sidePanel` permission. Adds `side_panel.default_path: "sidepanel.html"`. |
| Popup UI | Database dropdown + "Save this page" button | Database dropdown + list of templates for that DB + "+ New form" link to options page. "Save this page" remains as fallback when no templates exist. |
| Options page | Auth + DB picker (assumed minimal — confirm against `PROJECT_STATUS.md`) | Adds form template editor section per database |
| Side panel | Does not exist | New surface. Renders form filler. Closes on submit. |

---

## Data model

```typescript
// src/shared/types/forms.ts

export type FormFieldType =
  | 'title'
  | 'rich_text'
  | 'url'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'number';

export type FormFieldSource =
  | { kind: 'literal'; value: string }
  | { kind: 'extracted'; key: keyof ExtractedPage } // 'title' | 'description' | 'selection' | ...
  | { kind: 'none' };

export type FormField = {
  id: string;                       // local UUID, stable across edits
  notion_property_id: string;       // Notion property ID — stable across renames
  notion_property_type: FormFieldType;
  label: string;                    // shown in form; defaults to Notion property name
  default: FormFieldSource;
  hidden: boolean;                  // not shown in form, default still applied
  locked: boolean;                  // shown but read-only
  required: boolean;                // client-side validation only
};

export type FormTemplate = {
  id: string;                       // local UUID
  database_id: string;
  name: string;                     // user-facing template name
  fields: FormField[];              // ordered
  created_at: string;               // ISO
  updated_at: string;
};
```

**Storage shape:**
```
forms:{databaseId} → FormTemplate[]   // max length 4
pending_save_target → {
  template_id: string;
  tab_id: number;
  extracted: ExtractedPage;
} | null
```

---

## UX flow

**Setup (one-time per database):**
1. User opens options page, picks a database, clicks "+ New form"
2. Editor shows the database's properties; user picks which to include, sets labels and defaults
3. Save → template stored under `forms:{databaseId}`

**Capture (every save):**
1. User clicks extension icon → popup opens
2. Popup shows templates for the currently-selected database
3. User clicks a template
4. Popup writes `pending_save_target` to storage, calls `chrome.sidePanel.open()`, closes itself
5. Side panel reads `pending_save_target`, fetches the template, renders fields pre-filled from `extracted`
6. User edits as needed, clicks "Save"
7. Side panel sends `CREATE_PAGE` with mapped property values, shows result, closes on success

**Right-click capture:** same as above, but step 1–3 are replaced by the context menu writing `pending_save_target` directly with the database's first template (or default-marked template, if we add that flag — defer).

---

## Acceptance criteria

| # | Criterion | Notes |
|---|---|---|
| 1 | `npm run typecheck && npm run build` pass on every commit in the branch | Mandatory per project convention |
| 2 | Options page can create a template for a database, list it, edit it, delete it | Persists across reload |
| 3 | Templates are limited to 4 per database (UI prevents 5th) | Free-tier match |
| 4 | Form template editor shows the database's actual properties, not a hardcoded list | Uses Notion schema fetch |
| 5 | Property binding survives a Notion property rename | Because we store property ID |
| 6 | Property binding gracefully fails if a property is **deleted** in Notion since the template was saved | Show "Property no longer exists" inline; let user remap or remove the field |
| 7 | All 8 supported property type renderers accept value, render input, fire onChange, validate format | Each has its own component test if/when tests are added |
| 8 | Side panel opens from popup template click | `chrome.sidePanel.open` called with current window |
| 9 | Side panel pre-fills fields from extracted page data per template defaults | Uses `FormFieldSource.kind === 'extracted'` |
| 10 | Submit creates the Notion page with all filled values mapped to the correct properties | End-to-end on a real database |
| 11 | Right-click "Save page to Notion" still works — uses first template, or falls back to Milestone C behavior if none exist | Backward compatibility |
| 12 | Disconnect / reconnect cycle does not corrupt stored templates | Templates outlive auth state |
| 13 | Switching the selected database in popup shows that DB's templates | Per-DB scoping is real, not fake |
| 14 | Side panel shows clear error if the database is no longer accessible (deleted, permissions revoked) | Don't crash silently |

---

## Known risks

1. **Side panel API is Chrome 114+.** Current install base is fine but worth a one-line check on first run to fail loud rather than silently.
2. **Schema drift.** A template saved against an old schema can desync. Acceptance criterion #6 covers deletion; rename is handled by the ID-based binding; type changes (e.g., user changes `select` to `multi_select` in Notion) need at least a "type mismatch — please re-bind" warning. Cheap to add.
3. **Pre-fill source coupling.** `FormFieldSource.kind === 'extracted'` references `ExtractedPage` keys by string. If the `ExtractedPage` type changes, templates may reference stale keys. Mitigation: enumerate allowed keys as a TS literal type so the editor shows a fixed dropdown.
4. **Side panel + popup coordination.** The popup closes immediately after calling `sidePanel.open()`, so any error during open is hard to surface. Should write an error flag to storage that the side panel reads, or use `chrome.runtime.sendMessage` from the side panel back to a (now-closed) popup. Prefer storage flag — simpler.
5. **Context menu → side panel.** Opening the side panel from a background script context menu requires the active window's tab ID. Confirm `chrome.sidePanel.open({ tabId })` works from the `contextMenus.onClicked` handler — there's a chance it requires a user gesture in a way that the menu click does/doesn't satisfy. Worth a 10-minute spike before committing to this entry point.

---

## Open questions

These should be resolved before starting commit 1. Most have a recommended default in brackets.

1. **Default template per database?** Add a `default: boolean` flag on `FormTemplate` to pick which one right-click uses? [Recommend: yes, simple flag, ship in commit 1]
2. **What happens when the user has 0 databases or hasn't picked one?** Popup currently handles this; does the form picker hide entirely, or show a setup prompt? [Recommend: same as current behavior — empty state with link to options]
3. **Should the form editor live in the options page, or a dedicated route in the popup?** [Recommend: options page — popup is too small for editing, and the options page already exists]
4. **Validation strictness.** Required fields client-side only, or also block submit? [Recommend: client-side block on submit, no async validation]
5. **What about the existing heuristic mapping (description → "Description"/"Summary"/"Notes")?** Keep it as the seed for new templates, or drop it? [Recommend: keep as seed — when user clicks "+ New form", pre-populate fields based on heuristics so the first template works without manual setup]
6. **`pending_save_target` cleanup.** When does it get cleared? On side panel submit? On side panel close? On timeout? [Recommend: cleared on side panel mount after read, plus a 5-minute TTL guard for stale targets]

---

## Reference

- `MILESTONES.md` — prior milestones (A, B, C)
- `PROJECT_STATUS.md` — full roadmap; section 2 item 4 is the parent of this milestone
- `CLAUDE.md` — Claude Code persistent context (update with new types and storage keys after commit 1)
- Chrome side panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Notion property types: https://developers.notion.com/reference/property-object

---

## Handoff to Claude Code

When starting the next session:

1. Branch from `main` at `dc3e4ae` to `milestone-d-forms`
2. Resolve the open questions above with the user before writing code
3. Update `CLAUDE.md` with the new types and storage keys after commit 1 lands
4. Each commit should pass `npm run typecheck && npm run build` — do not skip
5. Test against a real Notion workspace with at least one database that has 6+ property types of mixed kinds
