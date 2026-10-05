import { describe, expect, it } from 'vitest';
import { formatLabel, getComponentName, getTypeName, shortenPath } from '../../src/page/fiberLabel';
import { createFiber, source } from './fiberHelpers';

function App() {
  return null;
}

describe('getTypeName', () => {
  it('reads names from functions, displayName and wrapped types', () => {
    const Named = () => null;
    const WithDisplayName = Object.assign(() => null, { displayName: 'Fancy' });

    expect(getTypeName(App)).toBe('App');
    expect(getTypeName(Named)).toBe('Named');
    expect(getTypeName(WithDisplayName)).toBe('Fancy');
    expect(getTypeName({ type: App })).toBe('App');
    expect(getTypeName({ render: App })).toBe('App');
    expect(getTypeName('div')).toBeNull();
    expect(getTypeName(null)).toBeNull();
  });
});

describe('shortenPath', () => {
  it('keeps the path from the last src segment', () => {
    expect(shortenPath('/home/me/app/src/App.tsx')).toBe('src/App.tsx');
    expect(shortenPath('C:\\work\\app\\src\\components\\Button.tsx')).toBe('src/components/Button.tsx');
    expect(shortenPath('/home/me/app/lib/App.tsx')).toBe('App.tsx');
  });
});

describe('getComponentName', () => {
  it('prefers the owner of the fiber that holds the resolved source', () => {
    const owner = createFiber(null, null, { type: App });
    const leaf = createFiber(source('/app/src/App.tsx', 12), owner, { type: 'button', _debugOwner: owner });

    expect(getComponentName(leaf, '/app/src/App.tsx', 12)).toBe('App');
  });

  it('falls back to the nearest named ancestor', () => {
    const parent = createFiber(null, null, { type: App });
    const leaf = createFiber(source('/app/src/App.tsx', 12), parent, { type: 'button' });

    expect(getComponentName(leaf, '/app/src/App.tsx', 12)).toBe('App');
    expect(getComponentName(leaf, '/app/src/Other.tsx', 1)).toBeNull();
  });
});

describe('formatLabel', () => {
  const element = document.createElement('button');

  it('formats a resolved source', () => {
    const owner = createFiber(null, null, { type: App });
    const leaf = createFiber(source('/app/src/App.tsx', 12), owner, { _debugOwner: owner });

    expect(formatLabel(element, leaf, { ok: true, filePath: '/app/src/App.tsx', line: 12 })).toBe(
      'App · src/App.tsx:12',
    );
  });

  it('describes missing fiber and failures', () => {
    const leaf = createFiber();

    expect(formatLabel(element, null, null)).toBe('button');
    expect(formatLabel(element, leaf, { ok: false, reason: 'no-source' })).toBe('button · no source');
    expect(formatLabel(element, leaf, { ok: false, reason: 'all-ignored' })).toBe('button · ignored');
  });
});
