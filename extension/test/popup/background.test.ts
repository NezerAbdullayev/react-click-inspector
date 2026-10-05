import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromeMock, createTab, getChromeMock, NO_RECEIVER_ERROR } from '../chromeMock';
import { LAST_EDITOR_MODE_KEY } from '../../src/popup/lastEditorMode';

let chromeMock: ChromeMock;

const runCommand = async (command: string, tab?: chrome.tabs.Tab) => {
  chromeMock.commands.onCommand.dispatch(command, tab);
  await new Promise(resolve => setTimeout(resolve, 0));
};

beforeEach(async () => {
  vi.resetModules();
  chromeMock = getChromeMock();
  await import('../../src/background');
});

describe('background commands', () => {
  it('activates copy mode on activate-copy', async () => {
    await runCommand('activate-copy', createTab({ id: 7 }));

    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'set-mode', mode: 'copy' });
  });

  it('activates vscode by default on activate-editor', async () => {
    await runCommand('activate-editor', createTab({ id: 7 }));

    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'set-mode', mode: 'vscode' });
  });

  it('activates the last used editor on activate-editor', async () => {
    chromeMock.storage.local.data.set(LAST_EDITOR_MODE_KEY, 'webstorm');

    await runCommand('activate-editor', createTab({ id: 7 }));

    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'set-mode', mode: 'webstorm' });
  });

  it('falls back to vscode when the stored editor is invalid', async () => {
    chromeMock.storage.local.data.set(LAST_EDITOR_MODE_KEY, 'copy');

    await runCommand('activate-editor', createTab({ id: 7 }));

    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'set-mode', mode: 'vscode' });
  });

  it('uses the active tab when the command has no tab', async () => {
    chromeMock.tabs.query.mockResolvedValue([createTab({ id: 3 })]);

    await runCommand('activate-copy');

    expect(chromeMock.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(3, { type: 'set-mode', mode: 'copy' });
  });

  it('ignores unknown commands', async () => {
    await runCommand('something-else', createTab({ id: 7 }));

    expect(chromeMock.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('silently ignores tabs without a content script', async () => {
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error(NO_RECEIVER_ERROR));

    await runCommand('activate-copy', createTab({ id: 7, url: 'chrome://extensions/' }));

    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe('background badge', () => {
  const sender = { tab: createTab({ id: 5 }) };

  it('shows ON while a mode is active', () => {
    chromeMock.runtime.dispatchMessage({ type: 'status', hasReact: true, hasSourceInfo: true, mode: 'copy' }, sender);

    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ tabId: 5, text: 'ON' });
  });

  it('clears the badge when the mode is off', () => {
    chromeMock.runtime.dispatchMessage({ type: 'status', hasReact: true, hasSourceInfo: true, mode: null }, sender);

    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ tabId: 5, text: '' });
  });

  it('ignores invalid events', () => {
    chromeMock.runtime.dispatchMessage({ type: 'status', hasReact: true, mode: 'copy' }, sender);

    expect(chromeMock.action.setBadgeText).not.toHaveBeenCalled();
  });

  it('remembers the last editor mode', async () => {
    chromeMock.runtime.dispatchMessage(
      { type: 'status', hasReact: true, hasSourceInfo: true, mode: 'webstorm' },
      sender,
    );

    await vi.waitFor(() => expect(chromeMock.storage.local.data.get(LAST_EDITOR_MODE_KEY)).toBe('webstorm'));
  });

  it('does not store copy as the editor mode', () => {
    chromeMock.runtime.dispatchMessage({ type: 'status', hasReact: true, hasSourceInfo: true, mode: 'copy' }, sender);

    expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
  });
});
