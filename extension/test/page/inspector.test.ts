import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPageInspector,
  IPageInspector,
  NO_FIBER_LOG,
  NO_SOURCE_WARNING,
} from '../../src/page/inspector';
import { PageToBridge } from '../../src/shared/messages';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { attachFiber, createFiber, ITestFiber, markContainer, source } from './fiberHelpers';

function App() {
  return null;
}

let inspector: IPageInspector | null = null;
let posted: PageToBridge[] = [];

const start = () => {
  inspector = createPageInspector(window, { detectionTimeoutMs: 200, detectionDebounceMs: 10 });
  return inspector;
};

const send = (data: unknown, eventSource: MessageEventSource | null = window) => {
  window.dispatchEvent(new MessageEvent('message', { data, source: eventSource }));
};

const results = () => posted.filter(message => message.type === 'result');
const lastStatus = () => posted.filter(message => message.type === 'status').pop();

const click = (element: Element) => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
};

const press = (key: string) => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};

const overlayHost = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-id="rci-ignore"]')).find(
    element => element.shadowRoot,
  );

const cursorStyle = () =>
  Array.from(document.querySelectorAll('style')).find(style => style.textContent?.includes('crosshair'));

const renderApp = (buttonFiber: ITestFiber | null) => {
  document.body.innerHTML =
    '<div id="root"><main><button id="target">Go</button><span id="plain">x</span></main></div>' +
    '<div data-id="rci-ignore"><button id="ignored">Toast</button></div>';
  markContainer(document.getElementById('root')!);
  const button = document.getElementById('target')!;
  if (buttonFiber) attachFiber(button, buttonFiber);
  return button;
};

const sourcedFiber = () => {
  const owner = createFiber(null, null, { type: App });
  return createFiber(source('/app/src/App.tsx', 12), owner, { type: 'button', _debugOwner: owner });
};

beforeEach(() => {
  posted = [];
  vi.spyOn(window, 'postMessage').mockImplementation((message: unknown) => {
    posted.push(message as PageToBridge);
  });
});

afterEach(() => {
  inspector?.destroy();
  inspector = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('status', () => {
  it('posts status on start and on ping', () => {
    renderApp(sourcedFiber());
    start();

    expect(posted).toEqual([
      { source: 'rci', type: 'status', hasReact: true, hasSourceInfo: true, mode: null },
    ]);

    send({ source: 'rci', type: 'ping' });
    expect(posted).toHaveLength(2);
    expect(lastStatus()).toEqual(posted[0]);
  });

  it('reports hasReact false on a non-React page without errors', () => {
    document.body.innerHTML = '<div id="root"><p>plain</p></div>';
    const error = vi.spyOn(console, 'error');
    start();

    expect(lastStatus()).toMatchObject({ hasReact: false, hasSourceInfo: false, mode: null });
    expect(error).not.toHaveBeenCalled();
  });

  it('detects React that mounts later', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    start();
    expect(lastStatus()).toMatchObject({ hasReact: false });

    const root = document.getElementById('root')!;
    markContainer(root);
    const child = document.createElement('div');
    attachFiber(child, createFiber(source('/app/src/App.tsx', 3)));
    root.appendChild(child);

    await vi.waitFor(() => {
      expect(lastStatus()).toMatchObject({ hasReact: true, hasSourceInfo: true });
    });
  });
});

describe('message filter', () => {
  it.each([
    ['a foreign source', { source: 'other', type: 'set-mode', mode: 'copy' }],
    ['an unknown mode', { source: 'rci', type: 'set-mode', mode: 'atom' }],
    ['a missing mode', { source: 'rci', type: 'set-mode' }],
    ['an unknown type', { source: 'rci', type: 'reset' }],
    ['malformed settings', { source: 'rci', type: 'settings', settings: { highlight: 'yes' } }],
    ['a string', 'set-mode'],
    ['null', null],
    ['a page-to-bridge message', { source: 'rci', type: 'status', hasReact: true, hasSourceInfo: true, mode: 'copy' }],
  ])('ignores %s', (_, data) => {
    renderApp(sourcedFiber());
    start();
    send(data);

    expect(inspector!.getStatus().mode).toBeNull();
    expect(posted).toHaveLength(1);
  });

  it('ignores valid messages that do not come from the window itself', () => {
    renderApp(sourcedFiber());
    start();
    send({ source: 'rci', type: 'set-mode', mode: 'copy' }, null);

    expect(inspector!.getStatus().mode).toBeNull();
  });

  it('applies settings messages', () => {
    renderApp(sourcedFiber());
    start();
    const settings = { ...DEFAULT_SETTINGS, ignoredPaths: ['node_modules'], highlight: false };
    send({ source: 'rci', type: 'settings', settings });

    expect(inspector!.getSettings()).toEqual(settings);
  });
});

describe('mode transitions', () => {
  it('activates, switches and deactivates with set-mode', () => {
    renderApp(sourcedFiber());
    start();

    send({ source: 'rci', type: 'set-mode', mode: 'copy' });
    expect(lastStatus()).toMatchObject({ mode: 'copy' });
    expect(cursorStyle()).toBeDefined();

    send({ source: 'rci', type: 'set-mode', mode: 'vscode' });
    expect(lastStatus()).toMatchObject({ mode: 'vscode' });
    expect(document.querySelectorAll('style')).toHaveLength(1);

    send({ source: 'rci', type: 'set-mode', mode: null });
    expect(lastStatus()).toMatchObject({ mode: null });
    expect(cursorStyle()).toBeUndefined();
  });

  it('does not intercept clicks while inactive', () => {
    const button = renderApp(sourcedFiber());
    start();
    const onClick = vi.fn();
    button.addEventListener('click', onClick);

    expect(click(button).defaultPrevented).toBe(false);
    expect(onClick).toHaveBeenCalled();
    expect(results()).toHaveLength(0);
  });

  it('Escape cancels the mode and cleans up overlay and cursor', () => {
    const button = renderApp(sourcedFiber());
    start();
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });
    button.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(overlayHost()).toBeDefined();

    press('a');
    expect(inspector!.getStatus().mode).toBe('copy');

    press('Escape');
    expect(inspector!.getStatus().mode).toBeNull();
    expect(lastStatus()).toMatchObject({ mode: null });
    expect(overlayHost()).toBeUndefined();
    expect(cursorStyle()).toBeUndefined();
  });
});

describe('click results', () => {
  it('sends the source and returns to null on success, blocking the app handler', () => {
    const button = renderApp(sourcedFiber());
    start();
    const onClick = vi.fn();
    button.addEventListener('click', onClick);
    send({ source: 'rci', type: 'set-mode', mode: 'webstorm' });

    const event = click(button);

    expect(event.defaultPrevented).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
    expect(results()).toEqual([
      { source: 'rci', type: 'result', ok: true, mode: 'webstorm', filePath: '/app/src/App.tsx', line: 12 },
    ]);
    expect(inspector!.getStatus().mode).toBeNull();
    expect(lastStatus()).toMatchObject({ mode: null });
  });

  it('stays active on no-fiber and logs like the npm package', () => {
    renderApp(sourcedFiber());
    start();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });

    click(document.getElementById('plain')!);

    expect(results()).toEqual([{ source: 'rci', type: 'result', ok: false, mode: 'copy', reason: 'no-fiber' }]);
    expect(log).toHaveBeenCalledWith(NO_FIBER_LOG, 'color: gray');
    expect(inspector!.getStatus().mode).toBe('copy');
  });

  it('stays active on no-source and warns with the npm package text', () => {
    renderApp(createFiber(null, createFiber(null)));
    start();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    send({ source: 'rci', type: 'set-mode', mode: 'vscode' });

    click(document.getElementById('target')!);

    expect(results()).toEqual([{ source: 'rci', type: 'result', ok: false, mode: 'vscode', reason: 'no-source' }]);
    expect(warn).toHaveBeenCalledWith(NO_SOURCE_WARNING);
    expect(NO_SOURCE_WARNING).toContain('React 19 is not supported');
    expect(inspector!.getStatus().mode).toBe('vscode');
  });

  it('stays active on all-ignored', () => {
    renderApp(createFiber(source('/app/node_modules/ui/Button.tsx', 4)));
    start();
    send({ source: 'rci', type: 'settings', settings: { ...DEFAULT_SETTINGS, ignoredPaths: ['node_modules'] } });
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });

    click(document.getElementById('target')!);

    expect(results()).toEqual([{ source: 'rci', type: 'result', ok: false, mode: 'copy', reason: 'all-ignored' }]);
    expect(inspector!.getStatus().mode).toBe('copy');
  });

  it('skips ignored paths and resolves to the next source', () => {
    const app = createFiber(source('/app/src/App.tsx', 20));
    renderApp(createFiber(source('/app/node_modules/ui/Button.tsx', 4), app));
    start();
    send({ source: 'rci', type: 'settings', settings: { ...DEFAULT_SETTINGS, ignoredPaths: ['node_modules'] } });
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });

    click(document.getElementById('target')!);

    expect(results()).toEqual([
      { source: 'rci', type: 'result', ok: true, mode: 'copy', filePath: '/app/src/App.tsx', line: 20 },
    ]);
  });

  it('lets clicks inside [data-id="rci-ignore"] through', () => {
    renderApp(sourcedFiber());
    start();
    const ignored = document.getElementById('ignored')!;
    const onClick = vi.fn();
    ignored.addEventListener('click', onClick);
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });

    const event = click(ignored);

    expect(event.defaultPrevented).toBe(false);
    expect(onClick).toHaveBeenCalled();
    expect(results()).toHaveLength(0);
    expect(inspector!.getStatus().mode).toBe('copy');
  });
});

describe('hover overlay', () => {
  it('shows a label with component, file and line', () => {
    const button = renderApp(sourcedFiber());
    start();
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });

    button.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

    const host = overlayHost()!;
    expect(host.style.pointerEvents).toBe('none');
    const label = host.shadowRoot!.querySelector<HTMLElement>('.label')!;
    expect(label.textContent).toBe('App · src/App.tsx:12');
    expect(label.hidden).toBe(false);
  });

  it('does not highlight when highlight is disabled', () => {
    const button = renderApp(sourcedFiber());
    start();
    send({ source: 'rci', type: 'settings', settings: { ...DEFAULT_SETTINGS, highlight: false } });
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });

    button.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

    const box = overlayHost()?.shadowRoot?.querySelector<HTMLElement>('.box');
    expect(box === undefined || box === null || box.hidden).toBe(true);
  });

  it('ignores hover over [data-id="rci-ignore"] elements', () => {
    renderApp(sourcedFiber());
    start();
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });

    document.getElementById('ignored')!.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

    expect(overlayHost()).toBeUndefined();
  });

  it('removes the overlay after a successful click', () => {
    const button = renderApp(sourcedFiber());
    start();
    send({ source: 'rci', type: 'set-mode', mode: 'copy' });
    button.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

    click(button);

    expect(overlayHost()).toBeUndefined();
    expect(cursorStyle()).toBeUndefined();
  });
});
