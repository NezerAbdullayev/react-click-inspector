export const IGNORE_ATTRIBUTE_VALUE = 'rci-ignore';

export interface IOverlay {
  host: HTMLElement;
  show: (element: Element, label: string) => void;
  hide: () => void;
  destroy: () => void;
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

  shadow.append(style, box, label);

  const show = (element: Element, text: string) => {
    if (!host.isConnected) doc.documentElement.appendChild(host);

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

  const destroy = () => {
    hide();
    host.remove();
  };

  return { host, show, hide, destroy };
};
