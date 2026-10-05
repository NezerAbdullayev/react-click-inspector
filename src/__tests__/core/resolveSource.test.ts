import { describe, expect, it } from 'vitest';
import { IFiber, IFiberSource, resolveSource } from '../../core';

const buildChain = (sources: (IFiberSource | null)[]): IFiber => {
  let parent: IFiber | null = null;

  for (let i = sources.length - 1; i >= 0; i--) {
    parent = { return: parent, _debugSource: sources[i] };
  }

  if (!parent) throw new Error('empty chain');
  return parent;
};

const appSource: IFiberSource = { fileName: '/project/src/App.tsx', lineNumber: 10, columnNumber: 5 };
const libSource: IFiberSource = { fileName: '/project/node_modules/lib/Button.tsx', lineNumber: 3, columnNumber: 2 };
const uiSource: IFiberSource = { fileName: '/project/src/ui/Card.tsx', lineNumber: 7 };

describe('resolveSource', () => {
  it('returns the nearest source', () => {
    expect(resolveSource(buildChain([appSource]))).toEqual({
      ok: true,
      filePath: '/project/src/App.tsx',
      line: 10,
      column: 5,
    });
  });

  it('skips fibers without source info', () => {
    expect(resolveSource(buildChain([null, { fileName: '', lineNumber: 1 }, appSource]))).toEqual({
      ok: true,
      filePath: '/project/src/App.tsx',
      line: 10,
      column: 5,
    });
  });

  it('returns no-source when the chain has no file names', () => {
    expect(resolveSource(buildChain([null, null]))).toEqual({ ok: false, reason: 'no-source' });
  });

  it('returns all-ignored when every source is ignored', () => {
    expect(resolveSource(buildChain([libSource, null]), 'node_modules')).toEqual({
      ok: false,
      reason: 'all-ignored',
    });
  });

  it('moves to the parent after an ignored source with a string ignoredPaths', () => {
    expect(resolveSource(buildChain([libSource, null, appSource]), 'node_modules')).toEqual({
      ok: true,
      filePath: '/project/src/App.tsx',
      line: 10,
      column: 5,
    });
  });

  it('supports an array of ignoredPaths', () => {
    expect(resolveSource(buildChain([libSource, uiSource, appSource]), ['node_modules', '/ui/'])).toEqual({
      ok: true,
      filePath: '/project/src/App.tsx',
      line: 10,
      column: 5,
    });
  });

  it('ignores nothing for an empty array', () => {
    expect(resolveSource(buildChain([uiSource, appSource]), [])).toEqual({
      ok: true,
      filePath: '/project/src/ui/Card.tsx',
      line: 7,
      column: undefined,
    });
  });
});
