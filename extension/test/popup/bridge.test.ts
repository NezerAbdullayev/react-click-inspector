import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromeMock, getChromeMock } from '../chromeMock';
import { DEFAULT_PAGE_STATUS, MESSAGE_SOURCE } from '../../src/shared/messages';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../src/shared/settings';

type WindowListener = Parameters<typeof window.addEventListener>[1];

let chromeMock: ChromeMock;
let postMessage: ReturnType<typeof vi.fn>;
let windowListeners: { type: string; listener: WindowListener }[];

const postFromPage = (data: unknown, source: Window | null = window) => {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
};

const pagePosts = (): unknown[] => postMessage.mock.calls.map(call => call[0]);

const isSettingsPost = (post: unknown) =>
  typeof post === 'object' && post !== null && (post as { type?: unknown }).type === 'settings';

const loadBridge = async () => {
  await import('../../src/content-bridge');
  await vi.waitFor(() => expect(pagePosts().some(isSettingsPost)).toBe(true));
  postMessage.mockClear();
};

beforeEach(() => {
  vi.resetModules();
  chromeMock = getChromeMock();
  windowListeners = [];
  const addEventListener = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation(
    (type: string, listener: WindowListener, options?: boolean | AddEventListenerOptions) => {
      windowListeners.push({ type, listener });
      addEventListener(type, listener, options);
    },
  );
  postMessage = vi.fn();
  vi.spyOn(window, 'postMessage').mockImplementation(postMessage);
});

afterEach(() => {
  windowListeners.forEach(({ type, listener }) => window.removeEventListener(type, listener));
  vi.restoreAllMocks();
});

describe('content-bridge settings', () => {
  it('sends stored settings to the page on start', async () => {
    chromeMock.storage.sync.data.set(SETTINGS_STORAGE_KEY, { ...DEFAULT_SETTINGS, highlight: false });
    await import('../../src/content-bridge');

    await vi.waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        { source: MESSAGE_SOURCE, type: 'settings', settings: { ...DEFAULT_SETTINGS, highlight: false } },
        '*',
      ),
    );
  });

  it('resends settings when they change', async () => {
    await loadBridge();

    await chromeMock.storage.sync.set({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, ignoredPaths: ['ui'] } });

    expect(pagePosts()).toEqual([
      { source: MESSAGE_SOURCE, type: 'settings', settings: { ...DEFAULT_SETTINGS, ignoredPaths: ['ui'] } },
    ]);
  });

  it('resends settings once after the first status from the page', async () => {
    await loadBridge();

    postFromPage({ source: MESSAGE_SOURCE, type: 'status', hasReact: true, hasSourceInfo: true, mode: null });
    postFromPage({ source: MESSAGE_SOURCE, type: 'status', hasReact: true, hasSourceInfo: true, mode: 'copy' });

    expect(pagePosts()).toEqual([{ source: MESSAGE_SOURCE, type: 'settings', settings: DEFAULT_SETTINGS }]);
  });
});

describe('content-bridge get-status', () => {
  it('answers from the cache synchronously', async () => {
    await loadBridge();
    postFromPage({ source: MESSAGE_SOURCE, type: 'status', hasReact: true, hasSourceInfo: true, mode: 'vscode' });

    const { sendResponse, results } = chromeMock.runtime.dispatchMessage({ type: 'get-status' });

    expect(sendResponse).toHaveBeenCalledWith({ hasReact: true, hasSourceInfo: true, mode: 'vscode' });
    expect(results).not.toContain(true);
  });

  it('returns the default status and pings the page when the cache is empty', async () => {
    await loadBridge();

    const { sendResponse, results } = chromeMock.runtime.dispatchMessage({ type: 'get-status' });

    expect(sendResponse).toHaveBeenCalledWith(DEFAULT_PAGE_STATUS);
    expect(results).not.toContain(true);
    expect(pagePosts()).toEqual([{ source: MESSAGE_SOURCE, type: 'ping' }]);
  });

  it('ignores invalid runtime requests', async () => {
    await loadBridge();

    const { sendResponse } = chromeMock.runtime.dispatchMessage({ type: 'set-mode', mode: 'emacs' });

    expect(sendResponse).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });
});

describe('content-bridge set-mode', () => {
  it('forwards set-mode to the page', async () => {
    await loadBridge();

    chromeMock.runtime.dispatchMessage({ type: 'set-mode', mode: 'webstorm' });

    expect(postMessage).toHaveBeenCalledWith({ source: MESSAGE_SOURCE, type: 'set-mode', mode: 'webstorm' }, '*');
  });
});

describe('content-bridge page messages', () => {
  it('pushes status as a runtime event', async () => {
    await loadBridge();

    postFromPage({ source: MESSAGE_SOURCE, type: 'status', hasReact: true, hasSourceInfo: false, mode: null });

    await vi.waitFor(() =>
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'status',
        hasReact: true,
        hasSourceInfo: false,
        mode: null,
      }),
    );
  });

  it('forwards results', async () => {
    await loadBridge();
    const result = { source: MESSAGE_SOURCE, type: 'result', ok: false, mode: 'copy', reason: 'no-source' };

    postFromPage(result);

    await vi.waitFor(() => expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(result));
  });

  it('ignores runtime errors when nobody listens', async () => {
    await loadBridge();
    chromeMock.runtime.sendMessage.mockRejectedValueOnce(new Error('Receiving end does not exist.'));
    chromeMock.runtime.sendMessage.mockImplementationOnce(() => {
      throw new Error('Extension context invalidated.');
    });

    postFromPage({ source: MESSAGE_SOURCE, type: 'status', hasReact: false, hasSourceInfo: false, mode: null });
    postFromPage({ source: MESSAGE_SOURCE, type: 'status', hasReact: true, hasSourceInfo: false, mode: null });
    await vi.waitFor(() => expect(chromeMock.runtime.sendMessage).toHaveBeenCalledTimes(2));
    await new Promise(resolve => setTimeout(resolve, 0));

    const { sendResponse } = chromeMock.runtime.dispatchMessage({ type: 'get-status' });
    expect(sendResponse).toHaveBeenCalledWith({ hasReact: true, hasSourceInfo: false, mode: null });
  });

  it.each([
    ['wrong source', { source: 'other', type: 'status', hasReact: true, hasSourceInfo: true, mode: null }],
    ['unknown type', { source: MESSAGE_SOURCE, type: 'hack' }],
    ['invalid mode', { source: MESSAGE_SOURCE, type: 'status', hasReact: true, hasSourceInfo: true, mode: 'emacs' }],
    ['missing fields', { source: MESSAGE_SOURCE, type: 'status', hasReact: true }],
    ['invalid result', { source: MESSAGE_SOURCE, type: 'result', ok: true, mode: 'copy', filePath: '', line: 0 }],
  ])('drops a message with %s', async (_name, data) => {
    await loadBridge();

    postFromPage(data);
    const { sendResponse } = chromeMock.runtime.dispatchMessage({ type: 'get-status' });

    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith(DEFAULT_PAGE_STATUS);
  });

  it('drops messages from other windows', async () => {
    await loadBridge();

    postFromPage({ source: MESSAGE_SOURCE, type: 'status', hasReact: true, hasSourceInfo: true, mode: null }, null);
    const { sendResponse } = chromeMock.runtime.dispatchMessage({ type: 'get-status' });

    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith(DEFAULT_PAGE_STATUS);
  });
});
