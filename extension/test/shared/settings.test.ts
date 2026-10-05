import { describe, expect, it, vi } from 'vitest';
import { getChromeMock } from '../chromeMock';
import {
  DEFAULT_SETTINGS,
  isExtensionSettings,
  loadSettings,
  normalizeSettings,
  onSettingsChanged,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from '../../src/shared/settings';

describe('normalizeSettings', () => {
  it.each([undefined, null, 'settings', 42, []])('returns defaults for %s', raw => {
    expect(normalizeSettings(raw)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a fresh ignoredPaths array', () => {
    const settings = normalizeSettings(undefined);
    settings.ignoredPaths.push('node_modules');
    expect(DEFAULT_SETTINGS.ignoredPaths).toEqual([]);
  });

  it('keeps valid values', () => {
    const settings = { ignoredPaths: ['components/ui'], openInEditorPath: '/__open', highlight: false };
    expect(normalizeSettings(settings)).toEqual(settings);
  });

  it('trims, deduplicates and drops invalid ignored paths', () => {
    expect(normalizeSettings({ ignoredPaths: [' ui ', '', 'ui', 3, null, 'lib'] }).ignoredPaths).toEqual([
      'ui',
      'lib',
    ]);
  });

  it('splits comma separated ignored paths', () => {
    expect(normalizeSettings({ ignoredPaths: 'ui, lib ,,shared' }).ignoredPaths).toEqual(['ui', 'lib', 'shared']);
  });

  it('normalizes openInEditorPath', () => {
    expect(normalizeSettings({ openInEditorPath: '  ' }).openInEditorPath).toBe('/__open-in-editor');
    expect(normalizeSettings({ openInEditorPath: 7 }).openInEditorPath).toBe('/__open-in-editor');
    expect(normalizeSettings({ openInEditorPath: '__open' }).openInEditorPath).toBe('/__open');
    expect(normalizeSettings({ openInEditorPath: ' /custom ' }).openInEditorPath).toBe('/custom');
  });

  it('falls back to the default highlight for non-boolean values', () => {
    expect(normalizeSettings({ highlight: 'false' }).highlight).toBe(true);
    expect(normalizeSettings({ highlight: false }).highlight).toBe(false);
  });
});

describe('isExtensionSettings', () => {
  it('accepts complete settings', () => {
    expect(isExtensionSettings(DEFAULT_SETTINGS)).toBe(true);
  });

  it('rejects incomplete or malformed settings', () => {
    expect(isExtensionSettings({ ...DEFAULT_SETTINGS, ignoredPaths: 'ui' })).toBe(false);
    expect(isExtensionSettings({ ignoredPaths: [], highlight: true })).toBe(false);
    expect(isExtensionSettings(null)).toBe(false);
  });
});

describe('settings storage', () => {
  it('loads defaults when nothing is stored', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    expect(getChromeMock().storage.sync.get).toHaveBeenCalledWith(SETTINGS_STORAGE_KEY);
  });

  it('loads and normalizes stored settings', async () => {
    getChromeMock().storage.sync.data.set(SETTINGS_STORAGE_KEY, {
      ignoredPaths: [' ui '],
      openInEditorPath: 'open',
      highlight: false,
    });

    await expect(loadSettings()).resolves.toEqual({
      ignoredPaths: ['ui'],
      openInEditorPath: '/open',
      highlight: false,
    });
  });

  it('saves merged and normalized settings to chrome.storage.sync', async () => {
    const saved = await saveSettings({ ignoredPaths: ['ui', 'ui', ' lib'] });

    expect(saved).toEqual({ ...DEFAULT_SETTINGS, ignoredPaths: ['ui', 'lib'] });
    expect(getChromeMock().storage.sync.data.get(SETTINGS_STORAGE_KEY)).toEqual(saved);
    expect(getChromeMock().storage.local.data.size).toBe(0);

    await saveSettings({ highlight: false });
    await expect(loadSettings()).resolves.toEqual({ ...saved, highlight: false });
  });

  it('notifies listeners about sync changes until unsubscribed', async () => {
    const callback = vi.fn();
    const unsubscribe = onSettingsChanged(callback);

    await saveSettings({ highlight: false });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, highlight: false });

    unsubscribe();
    await saveSettings({ highlight: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('ignores changes from other storage areas and keys', async () => {
    const callback = vi.fn();
    onSettingsChanged(callback);

    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: { highlight: false } });
    await chrome.storage.sync.set({ lastEditorMode: 'webstorm' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('normalizes removed settings to defaults', async () => {
    await saveSettings({ highlight: false });
    const callback = vi.fn();
    onSettingsChanged(callback);

    await chrome.storage.sync.remove(SETTINGS_STORAGE_KEY);

    expect(callback).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });
});
