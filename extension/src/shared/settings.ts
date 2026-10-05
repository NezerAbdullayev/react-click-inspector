export interface IExtensionSettings {
  ignoredPaths: string[];
  openInEditorPath: string;
  highlight: boolean;
}

export const SETTINGS_STORAGE_KEY = 'settings';

export const DEFAULT_SETTINGS: IExtensionSettings = {
  ignoredPaths: [],
  openInEditorPath: '/__open-in-editor',
  highlight: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isExtensionSettings = (value: unknown): value is IExtensionSettings =>
  isRecord(value) &&
  Array.isArray(value.ignoredPaths) &&
  value.ignoredPaths.every(path => typeof path === 'string') &&
  typeof value.openInEditorPath === 'string' &&
  typeof value.highlight === 'boolean';

const normalizeIgnoredPaths = (raw: unknown): string[] => {
  const items = typeof raw === 'string' ? raw.split(',') : Array.isArray(raw) ? raw : null;
  if (!items) return [...DEFAULT_SETTINGS.ignoredPaths];

  const paths = items
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0);

  return Array.from(new Set(paths));
};

const normalizeOpenInEditorPath = (raw: unknown): string => {
  if (typeof raw !== 'string') return DEFAULT_SETTINGS.openInEditorPath;

  const path = raw.trim();
  if (!path) return DEFAULT_SETTINGS.openInEditorPath;

  return path.startsWith('/') ? path : `/${path}`;
};

export const normalizeSettings = (raw: unknown): IExtensionSettings => {
  const source = isRecord(raw) ? raw : {};

  return {
    ignoredPaths: normalizeIgnoredPaths(source.ignoredPaths),
    openInEditorPath: normalizeOpenInEditorPath(source.openInEditorPath),
    highlight: typeof source.highlight === 'boolean' ? source.highlight : DEFAULT_SETTINGS.highlight,
  };
};

export const loadSettings = async (): Promise<IExtensionSettings> => {
  const stored = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);
  return normalizeSettings(stored[SETTINGS_STORAGE_KEY]);
};

export const saveSettings = async (
  settings: Partial<IExtensionSettings>,
): Promise<IExtensionSettings> => {
  const current = await loadSettings();
  const next = normalizeSettings({ ...current, ...settings });
  await chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: next });
  return next;
};

export const onSettingsChanged = (
  callback: (settings: IExtensionSettings) => void,
): (() => void) => {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'sync' || !(SETTINGS_STORAGE_KEY in changes)) return;
    callback(normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue));
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
};
