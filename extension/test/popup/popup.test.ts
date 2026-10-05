import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromeMock, createTab, getChromeMock, NO_RECEIVER_ERROR } from '../chromeMock';
import { IPageStatus } from '../../src/shared/messages';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../src/shared/settings';
import { LAST_EDITOR_MODE_KEY } from '../../src/popup/lastEditorMode';
import { getStatusText, initPopup, TEXT } from '../../src/popup/popupApp';

let chromeMock: ChromeMock;
let root: HTMLElement;
let closeSpy: ReturnType<typeof vi.fn>;

const devStatus: IPageStatus = { hasReact: true, hasSourceInfo: true, mode: null };

const respondWith = (status: unknown) => {
  chromeMock.tabs.sendMessage.mockImplementation(async (_tabId, message) =>
    (message as { type: string }).type === 'get-status' ? status : undefined,
  );
};

const statusText = () => root.querySelector('[data-role="status"]')?.textContent;
const enableButton = () => root.querySelector<HTMLButtonElement>('[data-role="enable"]');
const modeButton = (mode: string) => root.querySelector<HTMLButtonElement>(`button[data-mode="${mode}"]`);
const input = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]`);

beforeEach(() => {
  chromeMock = getChromeMock();
  root = document.createElement('main');
  document.body.append(root);
  closeSpy = vi.fn();
  vi.spyOn(window, 'close').mockImplementation(closeSpy);
});

afterEach(() => {
  root.remove();
  vi.restoreAllMocks();
});

describe('getStatusText', () => {
  it.each([
    [{ hasReact: true, hasSourceInfo: true, mode: null }, TEXT.devBuild],
    [{ hasReact: true, hasSourceInfo: false, mode: null }, TEXT.noSourceInfo],
    [{ hasReact: false, hasSourceInfo: false, mode: null }, TEXT.noReact],
  ])('%o -> %s', (status, text) => {
    expect(getStatusText({ kind: 'active', status })).toBe(text);
  });

  it('uses the exact texts', () => {
    expect([TEXT.devBuild, TEXT.noSourceInfo, TEXT.noReact, TEXT.inactive]).toEqual([
      'React dev build tapıldı',
      'React tapıldı, amma mənbə məlumatı yoxdur (React 19 və ya production build)',
      'React tapılmadı',
      'Bu səhifədə aktiv deyil',
    ]);
  });
});

describe('popup status', () => {
  it('asks the active tab for its status', async () => {
    respondWith(devStatus);
    await initPopup(root);

    expect(chromeMock.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'get-status' });
  });

  it.each([
    [devStatus, TEXT.devBuild],
    [{ hasReact: true, hasSourceInfo: false, mode: null }, TEXT.noSourceInfo],
    [{ hasReact: false, hasSourceInfo: false, mode: null }, TEXT.noReact],
  ])('shows the status %o', async (status, text) => {
    respondWith(status);
    await initPopup(root);

    expect(statusText()).toBe(text);
  });

  it('shows the inactive state for "Receiving end does not exist"', async () => {
    const warn = vi.spyOn(console, 'warn');
    chromeMock.tabs.query.mockResolvedValue([createTab({ url: 'chrome://extensions/' })]);
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error(NO_RECEIVER_ERROR));

    await initPopup(root);

    expect(statusText()).toBe(TEXT.inactive);
    expect(warn).not.toHaveBeenCalled();
    expect(enableButton()?.hidden).toBe(true);
    ['copy', 'vscode', 'webstorm'].forEach(mode => expect(modeButton(mode)?.disabled).toBe(true));
  });

  it('updates the status from runtime events of the same tab', async () => {
    respondWith({ hasReact: false, hasSourceInfo: false, mode: null });
    await initPopup(root);

    chromeMock.runtime.dispatchMessage({ type: 'status', ...devStatus, mode: 'copy' }, { tab: createTab({ id: 2 }) });
    expect(statusText()).toBe(TEXT.noReact);

    chromeMock.runtime.dispatchMessage({ type: 'status', ...devStatus, mode: 'copy' }, { tab: createTab({ id: 1 }) });
    expect(statusText()).toBe(TEXT.devBuild);
    expect(modeButton('copy')?.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('popup modes', () => {
  it('renders three mode buttons with aria-pressed', async () => {
    respondWith({ ...devStatus, mode: 'vscode' });
    await initPopup(root);

    expect(Array.from(root.querySelectorAll('button[data-mode]')).map(button => button.textContent)).toEqual([
      'Copy path',
      'VS Code',
      'WebStorm',
    ]);
    expect(modeButton('copy')?.getAttribute('aria-pressed')).toBe('false');
    expect(modeButton('vscode')?.getAttribute('aria-pressed')).toBe('true');
    expect(modeButton('webstorm')?.disabled).toBe(false);
  });

  it('shows the WebStorm dev server note only while WebStorm mode is active', async () => {
    const note = () => root.querySelector<HTMLParagraphElement>('[data-role="webstorm-note"]');
    respondWith({ ...devStatus, mode: 'webstorm' });
    await initPopup(root);

    expect(TEXT.webstormNote).toBe('Requires Vite/Rsbuild dev server');
    expect(note()?.textContent).toBe(TEXT.webstormNote);
    expect(note()?.hidden).toBe(false);
    expect(modeButton('webstorm')?.title).toBe(TEXT.webstormNote);

    root.remove();
    root = document.createElement('main');
    document.body.append(root);
    respondWith({ ...devStatus, mode: 'vscode' });
    await initPopup(root);

    expect(note()?.hidden).toBe(true);
  });

  it('disables mode buttons without source info', async () => {
    respondWith({ hasReact: true, hasSourceInfo: false, mode: null });
    await initPopup(root);

    ['copy', 'vscode', 'webstorm'].forEach(mode => expect(modeButton(mode)?.disabled).toBe(true));
  });

  it('sends set-mode and closes the popup', async () => {
    respondWith(devStatus);
    await initPopup(root);

    modeButton('copy')?.click();

    await vi.waitFor(() => expect(closeSpy).toHaveBeenCalled());
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'set-mode', mode: 'copy' });
  });

  it('turns the active mode off when clicked again', async () => {
    respondWith({ ...devStatus, mode: 'copy' });
    await initPopup(root);

    modeButton('copy')?.click();

    await vi.waitFor(() => expect(closeSpy).toHaveBeenCalled());
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'set-mode', mode: null });
  });

  it('remembers the selected editor for the shortcut', async () => {
    respondWith(devStatus);
    await initPopup(root);

    modeButton('webstorm')?.click();

    await vi.waitFor(() => expect(closeSpy).toHaveBeenCalled());
    expect(chromeMock.storage.local.data.get(LAST_EDITOR_MODE_KEY)).toBe('webstorm');
  });
});

describe('popup settings', () => {
  it('fills the form with stored settings', async () => {
    chromeMock.storage.sync.data.set(SETTINGS_STORAGE_KEY, {
      ignoredPaths: ['components/ui', 'lib'],
      openInEditorPath: '/__open',
      highlight: false,
    });
    await initPopup(root);

    expect(input('ignoredPaths')?.value).toBe('components/ui, lib');
    expect(input('openInEditorPath')?.value).toBe('/__open');
    expect(input('highlight')?.checked).toBe(false);
  });

  it('saves settings on change', async () => {
    await initPopup(root);
    const ignored = input('ignoredPaths');
    const editorPath = input('openInEditorPath');
    const highlight = input('highlight');
    if (!ignored || !editorPath || !highlight) throw new Error('missing inputs');

    ignored.value = ' ui, lib ,, ';
    ignored.dispatchEvent(new Event('change', { bubbles: true }));
    editorPath.value = '__custom';
    editorPath.dispatchEvent(new Event('change', { bubbles: true }));
    highlight.checked = false;
    highlight.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() =>
      expect(chromeMock.storage.sync.data.get(SETTINGS_STORAGE_KEY)).toEqual({
        ignoredPaths: ['ui', 'lib'],
        openInEditorPath: '/__custom',
        highlight: false,
      }),
    );
    await vi.waitFor(() => expect(root.querySelector<HTMLElement>('[data-role="saved"]')?.hidden).toBe(false));
    expect(ignored.value).toBe('ui, lib');
    expect(editorPath.value).toBe('/__custom');
  });

  it('does not overwrite a field that is being edited', async () => {
    await initPopup(root);
    const ignored = input('ignoredPaths');
    const editorPath = input('openInEditorPath');
    if (!ignored || !editorPath) throw new Error('missing inputs');

    ignored.value = 'ui';
    ignored.dispatchEvent(new Event('change', { bubbles: true }));
    editorPath.focus();
    editorPath.value = '/__typing';

    await vi.waitFor(() => expect(root.querySelector<HTMLElement>('[data-role="saved"]')?.hidden).toBe(false));
    expect(editorPath.value).toBe('/__typing');
    expect(chromeMock.storage.sync.data.get(SETTINGS_STORAGE_KEY)).toEqual(
      expect.objectContaining({ ignoredPaths: ['ui'] }),
    );
  });

  it('shows default settings when nothing is stored', async () => {
    await initPopup(root);

    expect(input('ignoredPaths')?.value).toBe('');
    expect(input('openInEditorPath')?.value).toBe(DEFAULT_SETTINGS.openInEditorPath);
    expect(input('highlight')?.checked).toBe(true);
  });
});

describe('popup site activation', () => {
  beforeEach(() => {
    chromeMock.tabs.query.mockResolvedValue([createTab({ id: 6, url: 'https://example.com/app' })]);
  });

  it('offers activation on a non-localhost site', async () => {
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error(NO_RECEIVER_ERROR));
    await initPopup(root);

    expect(statusText()).toBe(TEXT.inactive);
    expect(enableButton()?.hidden).toBe(false);
    expect(enableButton()?.textContent).toBe(TEXT.enableOnSite);
  });

  it('does not offer activation on localhost', async () => {
    chromeMock.tabs.query.mockResolvedValue([createTab({ url: 'http://localhost:5173/' })]);
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error(NO_RECEIVER_ERROR));
    await initPopup(root);

    expect(enableButton()?.hidden).toBe(true);
  });

  it('registers, injects and refreshes the status without reload', async () => {
    chromeMock.tabs.sendMessage.mockRejectedValueOnce(new Error(NO_RECEIVER_ERROR));
    await initPopup(root);
    respondWith({ hasReact: false, hasSourceInfo: false, mode: null });

    enableButton()?.click();

    await vi.waitFor(() => expect(statusText()).toBe(TEXT.noReact));
    expect(chromeMock.permissions.request).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
    expect(chromeMock.scripting.registerContentScripts).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ js: ['page-inspector.js'], world: 'MAIN' })]),
    );
    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 6 }, files: ['page-inspector.js'], world: 'MAIN' }),
    );
    expect(enableButton()?.hidden).toBe(true);
  });

  it('shows a message when the permission is denied', async () => {
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error(NO_RECEIVER_ERROR));
    chromeMock.permissions.request.mockResolvedValueOnce(false);
    await initPopup(root);

    enableButton()?.click();

    await vi.waitFor(() => expect(statusText()).toBe(TEXT.permissionDenied));
    expect(chromeMock.scripting.registerContentScripts).not.toHaveBeenCalled();
    expect(enableButton()?.disabled).toBe(false);
  });
});
