import { describe, expect, it } from 'vitest';
import { getVSCodeLink } from '../utils';

describe('getVSCodeLink', () => {
  it('builds a vscode link with forward slashes', () => {
    expect(getVSCodeLink('C:\\project\\src\\App.tsx', 12)).toBe('vscode://file/C:/project/src/App.tsx:12:1');
  });

  it('keeps posix paths as they are', () => {
    expect(getVSCodeLink('/home/me/src/App.tsx', 3, 'vsCode')).toBe('vscode://file//home/me/src/App.tsx:3:1');
  });

  it('builds a webstorm link', () => {
    expect(getVSCodeLink('/src/App.tsx', 7, 'webstorm')).toBe(
      'jetbrains://webstorm/navigate/reference?file=%2Fsrc%2FApp.tsx&line=7',
    );
  });
});
