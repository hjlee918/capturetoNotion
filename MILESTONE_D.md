# Milestone D — Form Templates

**Status:** Not started
**Branch:** TBD
**Goal:** Per-database form definitions that map extracted page data to Notion properties, rendered dynamically in the popup.

---

## Scope

1. **Form definition model** — saved in `chrome.storage.local` per database:
   - Form name
   - Field mappings: which `ExtractedPage` field (or site `extras` key) goes to which Notion property
   - Default values and overrides per field
   - Up to 4 forms per database (free tier reference)

2. **Form editor UI** in `src/options/`:
   - Pick a database
   - Show its schema (title, rich_text, select, multi_select, date, url, number, checkbox, etc.)
   - Map each schema property to a source: `title`, `url`, `description`, `author`, `site_name`, `image`, `published_time`, `selection`, or any `extras.*` key
   - Save, rename, delete forms

3. **Dynamic property inputs in popup** — when saving, if a form is selected:
   - Render the correct input widget per Notion property type
   - text → plain text input
   - select → dropdown of the DB's options
   - multi_select → tag picker
   - date → date picker
   - checkbox → toggle
   - number → number input
   - Pre-fill values from the current `ExtractedPage`

4. **Popup UI updates**:
   - After picking a database, show the saved forms for that DB (or a default "Basic" form)
   - "Save with form" button uses the selected form's mappings
   - If no forms exist, keep the current Milestone C behavior (direct save)

5. **Message handlers**:
   - `GET_FORMS` — already returns forms from storage (wired in Milestone A), needs to filter by `databaseId`
   - `SET_FORM` / `DELETE_FORM` — new
   - `EXTRACT_AND_SAVE` — accept an optional `formId`, apply mappings before calling `createPage`

## Open questions

- Should form templates be scoped per-workspace or per-database? Per-database is simpler and matches the reference product.
- Should we support relations in forms? Notion relation properties require page IDs. Skip for now.
- Should the popup show a live preview of the Notion page being created? Out of scope for this milestone.

## Not in this milestone

- Screenshots & image picker
- Auto-extraction rules beyond the three sites already done
- History view UI
- Settings page beyond what's already wired
- Public OAuth (still internal token only)

## Commits

TBD — fill in after implementation.

## Test results

TBD — fill in after testing.
