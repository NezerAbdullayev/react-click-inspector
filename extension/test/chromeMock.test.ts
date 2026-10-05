import { describe, expect, it, vi } from 'vitest';
import { createTab, getChromeMock, NO_RECEIVER_ERROR, resetChromeMock } from './chromeMock';

describe('chromeMock', () => {
  it('is installed as the global chrome object', () => {
    expect(globalThis.chrome).toBe(getChromeMock());
  });

  it('starts every test with empty storage and listeners', async () => {
    expect(getChromeMock().storage.sync.data.size).toBe(0);
    expect(getChromeMock().runtime.onMessage.hasListeners()).toBe(false);

    await chrome.storage.sync.set({ key: 'value' });
    chrome.runtime.onMessage.addListener(() => undefined);
  });

  it('was reset after the previous test', () => {
    expect(getChromeMock().storage.sync.data.size).toBe(0);
    expect(getChromeMock().runtime.onMessage.hasListeners()).toBe(false);
  });

  it('dispatches runtime messages and captures sendResponse', () => {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      sendResponse({ echo: message });
      return false;
    });

    const { sendResponse, results } = getChromeMock().runtime.dispatchMessage({ type: 'get-status' });

    expect(sendResponse).toHaveBeenCalledWith({ echo: { type: 'get-status' } });
    expect(results).toEqual([false]);
  });

  it('supports storage get variants and change events', async () => {
    const onChanged = vi.fn();
    chrome.storage.onChanged.addListener(onChanged);

    await chrome.storage.local.set({ a: 1, b: { c: 2 } });

    await expect(chrome.storage.local.get('a')).resolves.toEqual({ a: 1 });
    await expect(chrome.storage.local.get(['a', 'missing'])).resolves.toEqual({ a: 1 });
    await expect(chrome.storage.local.get({ missing: 'fallback' })).resolves.toEqual({ missing: 'fallback' });
    await expect(chrome.storage.local.get(null)).resolves.toEqual({ a: 1, b: { c: 2 } });
    expect(onChanged).toHaveBeenCalledWith(
      { a: { oldValue: undefined, newValue: 1 }, b: { oldValue: undefined, newValue: { c: 2 } } },
      'local',
    );
  });

  it('allows tests to simulate a missing receiver', async () => {
    getChromeMock().tabs.sendMessage.mockRejectedValueOnce(new Error(NO_RECEIVER_ERROR));

    await expect(chrome.tabs.sendMessage(1, { type: 'get-status' })).rejects.toThrow(NO_RECEIVER_ERROR);
    await expect(chrome.tabs.query({ active: true, currentWindow: true })).resolves.toEqual([createTab()]);
  });

  it('rejects duplicate content script ids', async () => {
    const script = { id: 'rci-page-inspector', js: ['page-inspector.js'], matches: ['https://example.com/*'] };

    await chrome.scripting.registerContentScripts([script]);
    await expect(chrome.scripting.registerContentScripts([script])).rejects.toThrow('Duplicate script ID');
    await expect(chrome.scripting.getRegisteredContentScripts({ ids: [script.id] })).resolves.toEqual([script]);
  });

  it('tracks granted optional origins', async () => {
    const origins = ['https://example.com/*'];

    await expect(chrome.permissions.contains({ origins })).resolves.toBe(false);
    await expect(chrome.permissions.request({ origins })).resolves.toBe(true);
    await expect(chrome.permissions.contains({ origins })).resolves.toBe(true);
  });

  it('dispatches commands to listeners', () => {
    const listener = vi.fn();
    chrome.commands.onCommand.addListener(listener);

    getChromeMock().commands.onCommand.dispatch('activate-copy');

    expect(listener).toHaveBeenCalledWith('activate-copy');
  });

  it('replaces the global object on reset', () => {
    const before = getChromeMock();
    const after = resetChromeMock();

    expect(after).not.toBe(before);
    expect(globalThis.chrome).toBe(after);
  });
});
