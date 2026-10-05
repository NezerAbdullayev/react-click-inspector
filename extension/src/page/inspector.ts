import { getFiberFromDom, resolveSource } from '../../../src/core';
import {
  ActiveMode,
  BridgeToPage,
  InspectorMode,
  IPageStatus,
  isBridgeToPage,
  MESSAGE_SOURCE,
  PageToBridge,
} from '../shared/messages';
import { DEFAULT_SETTINGS, IExtensionSettings } from '../shared/settings';
import { runAction } from './actions';
import { detectReact, IReactDetection } from './detect';
import { formatLabel } from './fiberLabel';
import { createOverlay, IGNORE_ATTRIBUTE_VALUE } from './overlay';
import { EDITOR_FAILED_TOAST, FAIL_TOAST, SUCCESS_TOAST } from './toastText';

export interface IPageInspectorOptions {
  detectionTimeoutMs?: number;
  detectionDebounceMs?: number;
}

export interface IPageInspector {
  getStatus: () => IPageStatus;
  getSettings: () => IExtensionSettings;
  setMode: (mode: InspectorMode) => void;
  destroy: () => void;
}

export const NO_FIBER_LOG = '%c[React Inspector] No fiber found for clicked element.';
export const NO_SOURCE_WARNING =
  '[React Inspector] No source information found for the clicked element. ' +
  'It needs a React 18 development build with JSX source info (_debugSource); React 19 is not supported.';

const IGNORE_SELECTOR = `[data-id="${IGNORE_ATTRIBUTE_VALUE}"]`;
const CURSOR_STYLE = '*, *::before, *::after { cursor: crosshair !important; }';

const isIgnoredTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(IGNORE_SELECTOR) !== null;

const hasRciSource = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && (data as { source?: unknown }).source === MESSAGE_SOURCE;

export const createPageInspector = (
  win: Window,
  { detectionTimeoutMs = 10000, detectionDebounceMs = 100 }: IPageInspectorOptions = {},
): IPageInspector => {
  const doc = win.document;
  const overlay = createOverlay(doc);
  let mode: InspectorMode = null;
  let settings: IExtensionSettings = { ...DEFAULT_SETTINGS, ignoredPaths: [...DEFAULT_SETTINGS.ignoredPaths] };
  let detection: IReactDetection = detectReact(doc);
  let cursorStyle: HTMLStyleElement | null = null;
  let hoveredElement: Element | null = null;
  let observer: MutationObserver | null = null;
  let detectionTimer: ReturnType<typeof setTimeout> | null = null;
  let detectionDeadline: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const getStatus = (): IPageStatus => ({ ...detection, mode });

  const post = (message: PageToBridge) => {
    win.postMessage(message, '*');
  };

  const postStatus = () => {
    post({ source: MESSAGE_SOURCE, type: 'status', ...getStatus() });
  };

  const stopDetection = () => {
    observer?.disconnect();
    observer = null;
    if (detectionTimer) clearTimeout(detectionTimer);
    if (detectionDeadline) clearTimeout(detectionDeadline);
    detectionTimer = null;
    detectionDeadline = null;
  };

  const refreshDetection = (): boolean => {
    const next = detectReact(doc);
    const changed =
      next.hasReact !== detection.hasReact || next.hasSourceInfo !== detection.hasSourceInfo;
    detection = next;
    if (detection.hasSourceInfo) stopDetection();
    return changed;
  };

  const startDetection = () => {
    if (detection.hasSourceInfo || typeof MutationObserver === 'undefined') return;

    observer = new MutationObserver(() => {
      if (detectionTimer) return;
      detectionTimer = setTimeout(() => {
        detectionTimer = null;
        if (refreshDetection()) postStatus();
      }, detectionDebounceMs);
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
    detectionDeadline = setTimeout(() => {
      if (refreshDetection()) postStatus();
      stopDetection();
    }, detectionTimeoutMs);
  };

  const describe = (element: Element): string => {
    const fiber = getFiberFromDom(element as HTMLElement);
    const result = fiber ? resolveSource(fiber, settings.ignoredPaths) : null;
    return formatLabel(element, fiber, result);
  };

  const highlight = (element: Element) => {
    hoveredElement = element;
    if (!settings.highlight) {
      overlay.hide();
      return;
    }
    overlay.show(element, describe(element));
  };

  const handleMouseMove = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element) || isIgnoredTarget(target)) return;
    highlight(target);
  };

  const sendResult = (activeMode: ActiveMode, element: Element) => {
    const fiber = getFiberFromDom(element as HTMLElement);

    if (!fiber) {
      console.log(NO_FIBER_LOG, 'color: gray');
      post({ source: MESSAGE_SOURCE, type: 'result', ok: false, mode: activeMode, reason: 'no-fiber' });
      return;
    }

    const result = resolveSource(fiber, settings.ignoredPaths);

    if (!result.ok) {
      if (result.reason === 'no-source') console.warn(NO_SOURCE_WARNING);
      const toastText = FAIL_TOAST[result.reason];
      if (toastText) overlay.toast(toastText, 'info');
      post({ source: MESSAGE_SOURCE, type: 'result', ok: false, mode: activeMode, reason: result.reason });
      return;
    }

    const { filePath, line } = result;
    const action = runAction(win, activeMode, { filePath, line }, settings);
    setMode(null);

    void action
      .catch(() => false)
      .then(ok => {
        if (destroyed) return;

        if (!ok) {
          overlay.toast(EDITOR_FAILED_TOAST[activeMode], 'error');
          post({
            source: MESSAGE_SOURCE,
            type: 'result',
            ok: false,
            mode: activeMode,
            reason: 'editor-request-failed',
          });
          return;
        }

        overlay.toast(SUCCESS_TOAST[activeMode], 'success');
        post({ source: MESSAGE_SOURCE, type: 'result', ok: true, mode: activeMode, filePath, line });
      });
  };

  const handleClick = (event: MouseEvent) => {
    const target = event.target;
    if (!mode || !(target instanceof Element) || isIgnoredTarget(target)) return;

    event.preventDefault();
    event.stopPropagation();
    sendResult(mode, target);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setMode(null);
  };

  const activate = () => {
    doc.addEventListener('click', handleClick, true);
    doc.addEventListener('mousemove', handleMouseMove, true);
    doc.addEventListener('keydown', handleKeyDown, true);

    cursorStyle = doc.createElement('style');
    cursorStyle.dataset.id = IGNORE_ATTRIBUTE_VALUE;
    cursorStyle.textContent = CURSOR_STYLE;
    (doc.head ?? doc.documentElement).appendChild(cursorStyle);
  };

  const deactivate = () => {
    doc.removeEventListener('click', handleClick, true);
    doc.removeEventListener('mousemove', handleMouseMove, true);
    doc.removeEventListener('keydown', handleKeyDown, true);

    cursorStyle?.remove();
    cursorStyle = null;
    hoveredElement = null;
    overlay.destroy();
  };

  function setMode(next: InspectorMode) {
    if (next === mode) return;

    const wasActive = mode !== null;
    mode = next;

    if (!wasActive && next !== null) activate();
    if (wasActive && next === null) deactivate();

    postStatus();
  }

  const applySettings = (next: IExtensionSettings) => {
    settings = { ...next, ignoredPaths: [...next.ignoredPaths] };
    if (!hoveredElement) return;
    if (settings.highlight && hoveredElement.isConnected) highlight(hoveredElement);
    else overlay.hide();
  };

  const handleBridgeMessage = (message: BridgeToPage) => {
    switch (message.type) {
      case 'set-mode':
        setMode(message.mode);
        return;
      case 'settings':
        applySettings(message.settings);
        return;
      case 'ping':
        refreshDetection();
        postStatus();
        return;
    }
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.source !== win || !hasRciSource(event.data)) return;
    if (!isBridgeToPage(event.data)) return;
    handleBridgeMessage(event.data);
  };

  win.addEventListener('message', handleMessage);
  startDetection();
  postStatus();

  const destroy = () => {
    destroyed = true;
    win.removeEventListener('message', handleMessage);
    stopDetection();
    if (mode !== null) {
      mode = null;
      deactivate();
    }
    overlay.dispose();
  };

  return {
    getStatus,
    getSettings: () => settings,
    setMode,
    destroy,
  };
};
