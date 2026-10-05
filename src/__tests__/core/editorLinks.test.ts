import { describe, expect, it } from 'vitest';
import { getOpenInEditorUrl } from '../../core';

describe('getOpenInEditorUrl', () => {
  it('builds an encoded open-in-editor url', () => {
    expect(getOpenInEditorUrl('http://localhost:5173', '/__open-in-editor', '/project/src/App.tsx', 12)).toBe(
      'http://localhost:5173/__open-in-editor?file=%2Fproject%2Fsrc%2FApp.tsx%3A12%3A1',
    );
  });

  it('encodes windows paths', () => {
    expect(getOpenInEditorUrl('http://localhost:3000', '/open', 'C:\\project\\App.tsx', 4)).toBe(
      'http://localhost:3000/open?file=C%3A%5Cproject%5CApp.tsx%3A4%3A1',
    );
  });
});
