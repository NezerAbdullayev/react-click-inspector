import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_STATUS,
  isBridgeToPage,
  isPageStatus,
  isPageToBridge,
  isRuntimeEvent,
  isRuntimeRequest,
} from '../../src/shared/messages';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

describe('isBridgeToPage', () => {
  it.each(['copy', 'vscode', 'webstorm', null])('accepts set-mode with mode %s', mode => {
    expect(isBridgeToPage({ source: 'rci', type: 'set-mode', mode })).toBe(true);
  });

  it('accepts settings and ping messages', () => {
    expect(isBridgeToPage({ source: 'rci', type: 'settings', settings: DEFAULT_SETTINGS })).toBe(true);
    expect(isBridgeToPage({ source: 'rci', type: 'ping' })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'ping'],
    ['an array', [{ source: 'rci', type: 'ping' }]],
    ['a missing source', { type: 'ping' }],
    ['a foreign source', { source: 'other', type: 'ping' }],
    ['an unknown type', { source: 'rci', type: 'reset' }],
    ['a missing mode', { source: 'rci', type: 'set-mode' }],
    ['an unknown mode', { source: 'rci', type: 'set-mode', mode: 'atom' }],
    ['an undefined mode', { source: 'rci', type: 'set-mode', mode: undefined }],
    ['missing settings', { source: 'rci', type: 'settings' }],
    [
      'settings with non-string ignored paths',
      { source: 'rci', type: 'settings', settings: { ...DEFAULT_SETTINGS, ignoredPaths: [1] } },
    ],
    [
      'settings with a non-boolean highlight',
      { source: 'rci', type: 'settings', settings: { ...DEFAULT_SETTINGS, highlight: 'yes' } },
    ],
    [
      'settings without openInEditorPath',
      { source: 'rci', type: 'settings', settings: { ignoredPaths: [], highlight: true } },
    ],
    ['a page message', { source: 'rci', type: 'status', ...DEFAULT_PAGE_STATUS }],
  ])('rejects %s', (_label, data) => {
    expect(isBridgeToPage(data)).toBe(false);
  });
});

describe('isPageToBridge', () => {
  it('accepts status messages', () => {
    expect(isPageToBridge({ source: 'rci', type: 'status', ...DEFAULT_PAGE_STATUS })).toBe(true);
    expect(
      isPageToBridge({ source: 'rci', type: 'status', hasReact: true, hasSourceInfo: true, mode: 'webstorm' }),
    ).toBe(true);
  });

  it('accepts successful results', () => {
    expect(
      isPageToBridge({
        source: 'rci',
        type: 'result',
        ok: true,
        mode: 'copy',
        filePath: '/app/src/App.tsx',
        line: 12,
      }),
    ).toBe(true);
  });

  it.each(['no-fiber', 'no-source', 'all-ignored', 'editor-request-failed'])(
    'accepts failed results with reason %s',
    reason => {
      expect(isPageToBridge({ source: 'rci', type: 'result', ok: false, mode: 'vscode', reason })).toBe(true);
    },
  );

  const result = { source: 'rci', type: 'result', ok: true, mode: 'copy', filePath: 'a.tsx', line: 1 };

  it.each([
    ['null', null],
    ['a foreign source', { source: 'other', type: 'status', ...DEFAULT_PAGE_STATUS }],
    ['an unknown type', { source: 'rci', type: 'hello' }],
    ['a status without hasReact', { source: 'rci', type: 'status', hasSourceInfo: false, mode: null }],
    ['a status with a string flag', { source: 'rci', type: 'status', ...DEFAULT_PAGE_STATUS, hasReact: 'true' }],
    ['a status with an unknown mode', { source: 'rci', type: 'status', ...DEFAULT_PAGE_STATUS, mode: 'x' }],
    ['a result with a null mode', { ...result, mode: null }],
    ['a result without ok', { ...result, ok: undefined }],
    ['a result with a string ok', { ...result, ok: 'true' }],
    ['a result with an empty file path', { ...result, filePath: '' }],
    ['a result with a numeric file path', { ...result, filePath: 1 }],
    ['a result with a string line', { ...result, line: '1' }],
    ['a result with a fractional line', { ...result, line: 1.5 }],
    ['a result with a zero line', { ...result, line: 0 }],
    ['a result with an unknown reason', { source: 'rci', type: 'result', ok: false, mode: 'copy', reason: 'oops' }],
    ['a failed result without reason', { source: 'rci', type: 'result', ok: false, mode: 'copy' }],
    ['a bridge message', { source: 'rci', type: 'ping' }],
  ])('rejects %s', (_label, data) => {
    expect(isPageToBridge(data)).toBe(false);
  });
});

describe('isRuntimeRequest', () => {
  it.each(['copy', 'vscode', 'webstorm', null])('accepts set-mode with mode %s', mode => {
    expect(isRuntimeRequest({ type: 'set-mode', mode })).toBe(true);
  });

  it('accepts get-status', () => {
    expect(isRuntimeRequest({ type: 'get-status' })).toBe(true);
  });

  it.each([
    ['undefined', undefined],
    ['a string', 'get-status'],
    ['an unknown type', { type: 'status' }],
    ['a missing mode', { type: 'set-mode' }],
    ['an unknown mode', { type: 'set-mode', mode: 'COPY' }],
  ])('rejects %s', (_label, message) => {
    expect(isRuntimeRequest(message)).toBe(false);
  });
});

describe('isPageStatus and isRuntimeEvent', () => {
  it('validates page status objects', () => {
    expect(isPageStatus(DEFAULT_PAGE_STATUS)).toBe(true);
    expect(isPageStatus({ hasReact: true, hasSourceInfo: false })).toBe(false);
  });

  it('validates runtime status events', () => {
    expect(isRuntimeEvent({ type: 'status', hasReact: true, hasSourceInfo: true, mode: 'copy' })).toBe(true);
    expect(isRuntimeEvent({ type: 'result', hasReact: true, hasSourceInfo: true, mode: 'copy' })).toBe(false);
    expect(isRuntimeEvent({ type: 'status', hasReact: true, mode: 'copy' })).toBe(false);
  });
});
