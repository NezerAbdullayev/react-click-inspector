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
});

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

    fireEvent.click(modeButton(/copy file path/i));
    fireEvent.click(modeButton(/vscode/i));

    expect(modeButton(/copy file path/i).getAttribute('aria-pressed')).toBe('false');
    expect(modeButton(/vscode/i).getAttribute('aria-pressed')).toBe('true');
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
