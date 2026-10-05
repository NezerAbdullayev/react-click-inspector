import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactClickInspector } from '../index';
import { LibraryButton } from './fixtures/LibraryButton';

const writeText = vi.fn().mockResolvedValue(undefined);
const onAppClick = vi.fn();

const App = () => (
  <div>
    <button type="button" onClick={onAppClick}>
      app button
    </button>
    <LibraryButton>library button</LibraryButton>
  </div>
);

const modeButton = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const openInEditorUrlPattern = (path: string) =>
  new RegExp(
    `^${window.location.origin}${path}\\?file=[^?]*ReactClickInspector\\.test\\.tsx%3A\\d+%3A1$`,
  );

describe('ReactClickInspector', () => {
  it('renders only children when disabled', () => {
    render(
      <ReactClickInspector enabled={false}>
        <App />
      </ReactClickInspector>,
    );

    expect(screen.getByText('app button')).toBeTruthy();
    expect(screen.queryByText('Settings')).toBeNull();
  });

  it('does not intercept clicks while no mode is active', () => {
    render(
      <ReactClickInspector enabled>
        <App />
      </ReactClickInspector>,
    );

    fireEvent.click(screen.getByText('app button'));

    expect(onAppClick).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the component file path and consumes the click', () => {
    render(
      <ReactClickInspector enabled>
        <App />
      </ReactClickInspector>,
    );

    fireEvent.click(modeButton(/copy file path/i));
    expect(modeButton(/copy file path/i).getAttribute('aria-pressed')).toBe('true');
    expect(document.body.style.cursor).toBe('crosshair');

    fireEvent.click(screen.getByText('app button'));

    expect(onAppClick).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/ReactClickInspector\.test\.tsx$/));
    expect(screen.getByText('success')).toBeTruthy();
    expect(modeButton(/copy file path/i).getAttribute('aria-pressed')).toBe('false');
    expect(document.body.style.cursor).toBe('');
  });

  it('skips ignored paths and uses the closest parent component', () => {
    const { unmount } = render(
      <ReactClickInspector enabled>
        <App />
      </ReactClickInspector>,
    );
    fireEvent.click(modeButton(/copy file path/i));
    fireEvent.click(screen.getByText('library button'));
    expect(writeText).toHaveBeenLastCalledWith(expect.stringMatching(/LibraryButton\.tsx$/));
    unmount();

    render(
      <ReactClickInspector enabled ignoredPaths="fixtures">
        <App />
      </ReactClickInspector>,
    );
    fireEvent.click(modeButton(/copy file path/i));
    fireEvent.click(screen.getByText('library button'));
    expect(writeText).toHaveBeenLastCalledWith(expect.stringMatching(/ReactClickInspector\.test\.tsx$/));
  });

  it('opens the file in VS Code', () => {
    const opened: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      opened.push(this.href);
    });

    render(
      <ReactClickInspector enabled>
        <App />
      </ReactClickInspector>,
    );

    fireEvent.click(modeButton(/vscode/i));
    fireEvent.click(screen.getByText('app button'));

    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatch(/^vscode:\/\/file\/.*ReactClickInspector\.test\.tsx:\d+:1$/);
    expect(modeButton(/vscode/i).getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps only one mode active at a time', () => {
    render(
      <ReactClickInspector enabled>
        <App />
      </ReactClickInspector>,
    );

    const pressed = () =>
      [/copy file path/i, /vscode/i, /webstorm/i].map(name => modeButton(name).getAttribute('aria-pressed'));

    fireEvent.click(modeButton(/copy file path/i));
    fireEvent.click(modeButton(/vscode/i));
    expect(pressed()).toEqual(['false', 'true', 'false']);

    fireEvent.click(modeButton(/webstorm/i));
    expect(pressed()).toEqual(['false', 'false', 'true']);

    fireEvent.click(modeButton(/copy file path/i));
    expect(pressed()).toEqual(['true', 'false', 'false']);

    fireEvent.click(modeButton(/copy file path/i));
    expect(pressed()).toEqual(['false', 'false', 'false']);
  });

  it('opens the file in WebStorm through the dev server', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ReactClickInspector enabled>
        <App />
      </ReactClickInspector>,
    );

    fireEvent.click(modeButton(/webstorm/i));
    expect(modeButton(/webstorm/i).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByText('app button'));

    expect(onAppClick).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(openInEditorUrlPattern('/__open-in-editor'));
    expect(modeButton(/webstorm/i).getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText(/does not support/i)).toBeNull();
  });

  it('uses a custom openInEditorPath', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ReactClickInspector enabled openInEditorPath="/custom-open">
        <App />
      </ReactClickInspector>,
    );

    fireEvent.click(modeButton(/webstorm/i));
    fireEvent.click(screen.getByText('app button'));

    expect(fetchMock.mock.calls[0][0]).toMatch(openInEditorUrlPattern('/custom-open'));
  });

  it.each([
    ['a non-ok response', () => Promise.resolve({ ok: false })],
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('shows an error popup on %s from the dev server', async (_, respond) => {
    vi.stubGlobal('fetch', vi.fn(respond));

    render(
      <ReactClickInspector enabled>
        <App />
      </ReactClickInspector>,
    );

    fireEvent.click(modeButton(/webstorm/i));
    fireEvent.click(screen.getByText('app button'));

    expect(await screen.findByText('Dev server does not support /__open-in-editor')).toBeTruthy();
    expect(screen.queryByText('success')).toBeNull();
  });

  it('cancels the active mode with Escape', () => {
    render(
      <ReactClickInspector enabled>
        <App />
      </ReactClickInspector>,
    );

    fireEvent.click(modeButton(/copy file path/i));
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(modeButton(/copy file path/i).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByText('app button'));
    expect(onAppClick).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
  });
});
