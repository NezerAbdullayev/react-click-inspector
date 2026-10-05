export const IGNORE_ATTRIBUTE_VALUE = 'rci-ignore';

export type ToastTone = 'success' | 'info' | 'error';

export const TOAST_DURATION_MS = 2000;
export const ERROR_TOAST_DURATION_MS = 4000;

export interface IOverlay {
  host: HTMLElement;
  show: (element: Element, label: string) => void;
  hide: () => void;
  toast: (text: string, tone: ToastTone) => void;
  destroy: () => void;
  dispose: () => void;
}

const OVERLAY_STYLES = `
  :host { all: initial; }
  .box {
    position: fixed;
    box-sizing: border-box;
    border: 2px solid #61dafb;
    background: rgba(97, 218, 251, 0.15);
    border-radius: 2px;
  }
  .label {
    position: fixed;
    max-width: 480px;
    padding: 2px 6px;
    border-radius: 3px;
    background: #20232a;
    color: #61dafb;
    font: 12px/18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    box-sizing: border-box;
    width: max-content;
    max-width: min(560px, calc(100vw - 32px));
    padding: 8px 14px;
    border-radius: 6px;
    background: #20232a;
    color: #ffffff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    font: 13px/18px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    text-align: center;
  }
  .toast[data-tone='success'] { border-left: 4px solid #4caf50; }
  .toast[data-tone='info'] { border-left: 4px solid #61dafb; }
  .toast[data-tone='error'] { border-left: 4px solid #f44336; }
  [hidden] { display: none; }
`;

export const createOverlay = (doc: Document): IOverlay => {
  const host = doc.createElement('div');
  host.dataset.id = IGNORE_ATTRIBUTE_VALUE;
  host.style.cssText =
    'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = OVERLAY_STYLES;

  const box = doc.createElement('div');
  box.className = 'box';
  box.hidden = true;

  const label = doc.createElement('div');
  label.className = 'label';
  label.hidden = true;

  const toastEl = doc.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.hidden = true;

  shadow.append(style, box, label, toastEl);

  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const attach = () => {
    if (!host.isConnected) doc.documentElement.appendChild(host);
  };

  const detachIfIdle = () => {
    if (box.hidden && toastEl.hidden) host.remove();
  };

  const clearToast = () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    toastEl.hidden = true;
  };

  const show = (element: Element, text: string) => {
    attach();

    const rect = element.getBoundingClientRect();
    box.style.top = `${rect.top}px`;
    box.style.left = `${rect.left}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    box.hidden = false;

    const viewportHeight = doc.defaultView?.innerHeight ?? 0;
    const labelTop = rect.bottom + 22 > viewportHeight ? Math.max(rect.top - 22, 0) : rect.bottom + 2;
    label.textContent = text;
    label.style.top = `${labelTop}px`;
    label.style.left = `${Math.max(rect.left, 0)}px`;
    label.hidden = false;
  };

  const hide = () => {
    box.hidden = true;
    label.hidden = true;
  };

  const toast = (text: string, tone: ToastTone) => {
    clearToast();
    attach();
    toastEl.textContent = text;
    toastEl.dataset.tone = tone;
    toastEl.hidden = false;
    toastTimer = setTimeout(
      () => {
        clearToast();
        detachIfIdle();
      },
      tone === 'error' ? ERROR_TOAST_DURATION_MS : TOAST_DURATION_MS,
    );
  };

  const destroy = () => {
    hide();
    detachIfIdle();
  };

  const dispose = () => {
    hide();
    clearToast();
    host.remove();
  };

  return { host, show, hide, toast, destroy, dispose };
};
