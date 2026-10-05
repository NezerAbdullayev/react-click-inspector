import { beforeEach, describe, expect, it } from 'vitest';
import { ChromeMock, getChromeMock } from '../chromeMock';
import {
  BRIDGE_SCRIPT_ID,
  canEnableOnSite,
  enableOnSite,
  getOriginPattern,
  PAGE_INSPECTOR_SCRIPT_ID,
} from '../../src/popup/siteAccess';

let chromeMock: ChromeMock;

beforeEach(() => {
  chromeMock = getChromeMock();
});

describe('getOriginPattern', () => {
  it.each([
    ['https://example.com/app?x=1', 'https://example.com/*'],
    ['http://127.0.0.2:8080/', 'http://127.0.0.2:8080/*'],
    ['chrome://extensions/', null],
    ['file:///C:/index.html', null],
    ['not a url', null],
    [undefined, null],
  ])('%s -> %s', (url, expected) => {
    expect(getOriginPattern(url)).toBe(expected);
  });
});

describe('canEnableOnSite', () => {
  it.each([
    ['https://example.com/', true],
    ['http://127.0.0.2:8080/', true],
    ['https://localhost:3000/', true],
    ['http://localhost:5173/', false],
    ['http://127.0.0.1:3000/', false],
    ['chrome://extensions/', false],
    [undefined, false],
  ])('%s -> %s', (url, expected) => {
    expect(canEnableOnSite(url)).toBe(expected);
  });
});

describe('enableOnSite', () => {
  it('requests the origin permission', async () => {
    await enableOnSite(4, 'https://example.com/page');

    expect(chromeMock.permissions.request).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
  });

  it('registers both scripts with page-inspector in the MAIN world', async () => {
    await expect(enableOnSite(4, 'https://example.com/page')).resolves.toBe('enabled');

    const [scripts] = chromeMock.scripting.registerContentScripts.mock.calls[0];
    expect(scripts).toEqual([
      expect.objectContaining({
        id: BRIDGE_SCRIPT_ID,
        js: ['content-bridge.js'],
        matches: ['https://example.com/*'],
        world: 'ISOLATED',
      }),
      expect.objectContaining({
        id: PAGE_INSPECTOR_SCRIPT_ID,
        js: ['page-inspector.js'],
        matches: ['https://example.com/*'],
        world: 'MAIN',
      }),
    ]);
  });

  it('injects both scripts into the open tab', async () => {
    await enableOnSite(4, 'https://example.com/page');

    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 4 },
      files: ['content-bridge.js'],
      world: 'ISOLATED',
    });
    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 4 },
      files: ['page-inspector.js'],
      world: 'MAIN',
    });
  });

  it('can be repeated and merges origins', async () => {
    await enableOnSite(4, 'https://example.com/page');
    await enableOnSite(4, 'https://example.com/other');
    await expect(enableOnSite(9, 'https://other.dev/')).resolves.toBe('enabled');

    expect(chromeMock.scripting.registered.get(BRIDGE_SCRIPT_ID)?.matches).toEqual([
      'https://example.com/*',
      'https://other.dev/*',
    ]);
    expect(chromeMock.scripting.registered.get(PAGE_INSPECTOR_SCRIPT_ID)).toEqual(
      expect.objectContaining({ world: 'MAIN', matches: ['https://example.com/*', 'https://other.dev/*'] }),
    );
  });

  it('stops when the permission is denied', async () => {
    chromeMock.permissions.request.mockResolvedValueOnce(false);

    await expect(enableOnSite(4, 'https://example.com/')).resolves.toBe('denied');

    expect(chromeMock.scripting.registerContentScripts).not.toHaveBeenCalled();
    expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('rejects unsupported urls', async () => {
    await expect(enableOnSite(4, 'chrome://extensions/')).resolves.toBe('unsupported');

    expect(chromeMock.permissions.request).not.toHaveBeenCalled();
  });
});
