type FormTemplate = unknown;
type SavedPage = unknown;

type Settings = {
  openNotionInDesktopApp: boolean;
  showSaveButtonsOnWebsites: boolean;
  rememberHighlights: boolean;
  hideContextMenuOption: boolean;
  embeddedPostFormat: 'callout' | 'toggle' | 'quote';
};

const STORAGE_KEYS = {
  forms: 'forms',
  history: 'history',
  settings: 'settings',
} as const;

const DEFAULT_SETTINGS: Settings = {
  openNotionInDesktopApp: false,
  showSaveButtonsOnWebsites: false,
  rememberHighlights: false,
  hideContextMenuOption: false,
  embeddedPostFormat: 'callout',
};

export async function getForms(): Promise<FormTemplate[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.forms);
  return (result[STORAGE_KEYS.forms] as FormTemplate[] | undefined) ?? [];
}

export async function getHistory(): Promise<SavedPage[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.history);
  return (result[STORAGE_KEYS.history] as SavedPage[] | undefined) ?? [];
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return (result[STORAGE_KEYS.settings] as Settings | undefined) ?? DEFAULT_SETTINGS;
}
