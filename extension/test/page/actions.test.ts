import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { copyPath, openInVSCode, openInWebStorm, runAction } from '../../src/page/actions';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

const target = { filePath: 'C:\\work\\app\\src\\App.tsx', line: 7 };

let execCommand: Mock<(command: string) => boolean>;

const setClipboard = (writeText?: (text: string) => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  });
};

beforeEach(() => {
  execCommand = vi.fn(() => true);
  Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(document, 'execCommand');
  document.body.innerHTML = '';
});

describe('copyPath', () => {
  it('writes the path with navigator.clipboard', async () => {
    const writeText = vi.fn(async () => undefined);
    setClipboard(writeText);

    await expect(copyPath(window, '/app/src/App.tsx')).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith('/app/src/App.tsx');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back to execCommand when the clipboard API rejects', async () => {
    setClipboard(vi.fn(async () => Promise.reject(new Error('NotAllowedError'))));
    let copiedValue: string | undefined;
    execCommand.mockImplementation(() => {
      copiedValue = document.querySelector<HTMLTextAreaElement>('textarea[data-id="rci-ignore"]')?.value;
      return true;
    });

    await expect(copyPath(window, '/app/src/App.tsx')).resolves.toBe(true);

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copiedValue).toBe('/app/src/App.tsx');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('falls back to execCommand when the clipboard API is missing', async () => {
    setClipboard();

    await expect(copyPath(window, '/app/src/App.tsx')).resolves.toBe(true);

    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('restores focus after the fallback', async () => {
    setClipboard();
    document.body.innerHTML = '<input id="field" />';
    const field = document.getElementById('field') as HTMLInputElement;
    field.focus();

    await copyPath(window, '/app/src/App.tsx');

    expect(document.activeElement).toBe(field);
  });

  it.each([
    ['returns false', () => false],
    [
      'throws',
      () => {
        throw new Error('not supported');
      },
    ],
  ])('fails when both ways fail and execCommand %s', async (_, implementation) => {
    setClipboard(vi.fn(async () => Promise.reject(new Error('NotAllowedError'))));
    execCommand.mockImplementation(implementation);

    await expect(copyPath(window, '/app/src/App.tsx')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });
});

describe('openInVSCode', () => {
  it('clicks a temporary vscode:// anchor', () => {
    const hrefs: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      hrefs.push(this.href);
    });

    expect(openInVSCode(window, target)).toBe(true);

    expect(hrefs).toEqual(['vscode://file/C:/work/app/src/App.tsx:7:1']);
    expect(document.querySelector('a')).toBeNull();
  });

  it('fails when the anchor click throws', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(openInVSCode(window, target)).toBe(false);
  });
});

describe('openInWebStorm', () => {
  const expectedUrl = `${location.origin}/__open-in-editor?file=${encodeURIComponent('C:\\work\\app\\src\\App.tsx:7:1')}`;

  it.each([
    ['an empty body', new Response(null, { status: 200 })],
    ['a text body', new Response('', { status: 200, headers: { 'content-type': 'text/plain' } })],
  ])('succeeds on 200 with %s', async (_, response) => {
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(openInWebStorm(window, target, '/__open-in-editor')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
  });

  it.each([
    ['404', () => new Response('Not found', { status: 404 })],
    ['500', () => new Response('', { status: 500 })],
    [
      'an index.html SPA fallback',
      () => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }),
    ],
    [
      'an uppercase HTML content type',
      () => new Response('<html>', { status: 200, headers: { 'content-type': 'Text/HTML' } }),
    ],
  ])('fails on %s', async (_, createResponse) => {
    vi.stubGlobal('fetch', vi.fn(async () => createResponse()));

    await expect(openInWebStorm(window, target, '/__open-in-editor')).resolves.toBe(false);
  });

  it('fails on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));

    await expect(openInWebStorm(window, target, '/__open-in-editor')).resolves.toBe(false);
  });

  it('fails when fetch throws synchronously', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new TypeError('Invalid URL');
      }),
    );

    await expect(openInWebStorm(window, target, '/__open-in-editor')).resolves.toBe(false);
  });
});

describe('runAction', () => {
  it('dispatches by mode with the configured open-in-editor path', async () => {
    const writeText = vi.fn(async () => undefined);
    setClipboard(writeText);
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const settings = { ...DEFAULT_SETTINGS, openInEditorPath: '/custom' };

    await expect(runAction(window, 'copy', target, settings)).resolves.toBe(true);
    await expect(runAction(window, 'vscode', target, settings)).resolves.toBe(true);
    await expect(runAction(window, 'webstorm', target, settings)).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith(target.filePath);
    expect(click).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([
      `${location.origin}/custom?file=${encodeURIComponent('C:\\work\\app\\src\\App.tsx:7:1')}`,
    ]);
  });
});
