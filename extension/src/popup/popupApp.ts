import {
  ActiveMode,
  ACTIVE_MODES,
  InspectorMode,
  IPageStatus,
  isPageStatus,
  isRuntimeEvent,
  RuntimeRequest,
} from '../shared/messages';
import { IExtensionSettings, loadSettings, saveSettings } from '../shared/settings';
import { isEditorMode, saveLastEditorMode } from './lastEditorMode';
import { canEnableOnSite, enableOnSite } from './siteAccess';

export const TEXT = {
  loading: 'Yoxlanılır…',
  inactive: 'Bu səhifədə aktiv deyil',
  devBuild: 'React dev build tapıldı',
  noSourceInfo: 'React tapıldı, amma mənbə məlumatı yoxdur (React 19 və ya production build)',
  noReact: 'React tapılmadı',
  enableOnSite: 'Bu saytda aktivləşdir',
  enabling: 'Aktivləşdirilir…',
  permissionDenied: 'İcazə verilmədi',
  enableFailed: 'Aktivləşdirmək alınmadı',
  settings: 'Ayarlar',
  ignoredPaths: 'Nəzərə alınmayan yollar (vergüllə ayrılmış)',
  openInEditorPath: 'Open-in-editor yolu (WebStorm)',
  highlight: 'Elementi vurğula',
  saved: 'Yadda saxlanıldı',
  webstormNote: 'Requires Vite/Rsbuild dev server',
};

const MODE_LABELS: Record<ActiveMode, string> = {
  copy: 'Copy path',
  vscode: 'VS Code',
  webstorm: 'WebStorm',
};

const NO_RECEIVER_MESSAGE = 'Receiving end does not exist';

export type PopupState = { kind: 'loading' } | { kind: 'inactive' } | { kind: 'active'; status: IPageStatus };

export const getStatusText = (state: PopupState): string => {
  if (state.kind === 'loading') return TEXT.loading;
  if (state.kind === 'inactive') return TEXT.inactive;
  if (!state.status.hasReact) return TEXT.noReact;
  return state.status.hasSourceInfo ? TEXT.devBuild : TEXT.noSourceInfo;
};

export const isNoReceiverError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes(NO_RECEIVER_MESSAGE);

export const requestStatus = async (tabId: number): Promise<PopupState> => {
  const request: RuntimeRequest = { type: 'get-status' };
  try {
    const response: unknown = await chrome.tabs.sendMessage(tabId, request);
    return isPageStatus(response) ? { kind: 'active', status: response } : { kind: 'inactive' };
  } catch (error) {
    if (!isNoReceiverError(error)) console.warn('[react-click-inspector]', error);
    return { kind: 'inactive' };
  }
};

const TEMPLATE = `
  <h1>React Click Inspector</h1>
  <p class="status" data-role="status" role="status"></p>
  <button type="button" class="enable" data-role="enable" hidden></button>
  <div class="modes" data-role="modes"></div>
  <p class="note" data-role="webstorm-note" hidden></p>
  <form class="settings" data-role="settings">
    <h2></h2>
    <label class="field">
      <span data-role="ignored-label"></span>
      <input type="text" name="ignoredPaths" placeholder="components/ui, lib" />
    </label>
    <label class="field">
      <span data-role="editor-path-label"></span>
      <input type="text" name="openInEditorPath" />
    </label>
    <label class="checkbox">
      <input type="checkbox" name="highlight" />
      <span data-role="highlight-label"></span>
    </label>
    <p class="saved" data-role="saved" hidden></p>
  </form>
`;

const query = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Popup element not found: ${selector}`);
  return element;
};

const getActiveTab = async (): Promise<chrome.tabs.Tab | undefined> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

export const initPopup = async (root: HTMLElement): Promise<void> => {
  root.innerHTML = TEMPLATE;

  const statusEl = query<HTMLParagraphElement>(root, '[data-role="status"]');
  const enableButton = query<HTMLButtonElement>(root, '[data-role="enable"]');
  const modesEl = query<HTMLDivElement>(root, '[data-role="modes"]');
  const webstormNoteEl = query<HTMLParagraphElement>(root, '[data-role="webstorm-note"]');
  const form = query<HTMLFormElement>(root, '[data-role="settings"]');
  const ignoredInput = query<HTMLInputElement>(form, 'input[name="ignoredPaths"]');
  const editorPathInput = query<HTMLInputElement>(form, 'input[name="openInEditorPath"]');
  const highlightInput = query<HTMLInputElement>(form, 'input[name="highlight"]');
  const savedEl = query<HTMLParagraphElement>(form, '[data-role="saved"]');

  query<HTMLHeadingElement>(form, 'h2').textContent = TEXT.settings;
  query<HTMLSpanElement>(form, '[data-role="ignored-label"]').textContent = TEXT.ignoredPaths;
  query<HTMLSpanElement>(form, '[data-role="editor-path-label"]').textContent = TEXT.openInEditorPath;
  query<HTMLSpanElement>(form, '[data-role="highlight-label"]').textContent = TEXT.highlight;
  enableButton.textContent = TEXT.enableOnSite;
  savedEl.textContent = TEXT.saved;
  webstormNoteEl.textContent = TEXT.webstormNote;

  let state: PopupState = { kind: 'loading' };

  const modeButtons = ACTIVE_MODES.map(mode => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode';
    button.dataset.mode = mode;
    button.textContent = MODE_LABELS[mode];
    if (mode === 'webstorm') button.title = TEXT.webstormNote;
    modesEl.append(button);
    return button;
  });

  const render = (url?: string) => {
    statusEl.textContent = getStatusText(state);
    statusEl.dataset.state = state.kind;

    const status = state.kind === 'active' ? state.status : null;
    modeButtons.forEach(button => {
      button.disabled = !status?.hasSourceInfo;
      button.setAttribute('aria-pressed', String(status?.mode === button.dataset.mode));
    });

    enableButton.hidden = state.kind !== 'inactive' || !canEnableOnSite(url);
    webstormNoteEl.hidden = status?.mode !== 'webstorm';
  };

  const fillSettings = (settings: IExtensionSettings) => {
    ignoredInput.value = settings.ignoredPaths.join(', ');
    editorPathInput.value = settings.openInEditorPath;
    highlightInput.checked = settings.highlight;
  };

  render();
  const [settings, tab] = await Promise.all([loadSettings(), getActiveTab()]);
  fillSettings(settings);

  const update = () => render(tab?.url);

  const refreshStatus = async () => {
    state = tab?.id === undefined ? { kind: 'inactive' } : await requestStatus(tab.id);
    update();
  };

  const selectMode = async (mode: ActiveMode) => {
    if (tab?.id === undefined || state.kind !== 'active') return;

    const nextMode: InspectorMode = state.status.mode === mode ? null : mode;
    const request: RuntimeRequest = { type: 'set-mode', mode: nextMode };
    if (isEditorMode(nextMode)) await saveLastEditorMode(nextMode).catch(() => undefined);
    await chrome.tabs.sendMessage(tab.id, request).catch(() => undefined);
    window.close();
  };

  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const mode = ACTIVE_MODES.find(item => item === button.dataset.mode);
      if (mode) void selectMode(mode);
    });
  });

  enableButton.addEventListener('click', () => {
    if (tab?.id === undefined) return;
    enableButton.disabled = true;
    enableButton.textContent = TEXT.enabling;

    enableOnSite(tab.id, tab.url)
      .then(result => {
        if (result === 'enabled') return refreshStatus();
        statusEl.textContent = result === 'denied' ? TEXT.permissionDenied : TEXT.enableFailed;
      })
      .catch(error => {
        console.warn('[react-click-inspector]', error);
        statusEl.textContent = TEXT.enableFailed;
      })
      .finally(() => {
        enableButton.disabled = false;
        enableButton.textContent = TEXT.enableOnSite;
      });
  });

  const showNormalizedValue = (field: EventTarget | null, settings: IExtensionSettings) => {
    if (field === document.activeElement) return;
    if (field === ignoredInput) ignoredInput.value = settings.ignoredPaths.join(', ');
    if (field === editorPathInput) editorPathInput.value = settings.openInEditorPath;
  };

  let saveQueue: Promise<void> = Promise.resolve();

  const persistSettings = (field: EventTarget | null) => {
    saveQueue = saveQueue
      .then(async () => {
        const saved = await saveSettings({
          ignoredPaths: ignoredInput.value.split(','),
          openInEditorPath: editorPathInput.value,
          highlight: highlightInput.checked,
        });
        showNormalizedValue(field, saved);
        savedEl.hidden = false;
      })
      .catch(error => console.warn('[react-click-inspector]', error));
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    persistSettings(null);
  });
  form.addEventListener('change', event => {
    persistSettings(event.target);
  });

  chrome.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isRuntimeEvent(message) || tab?.id === undefined || sender.tab?.id !== tab.id) return;
    state = {
      kind: 'active',
      status: { hasReact: message.hasReact, hasSourceInfo: message.hasSourceInfo, mode: message.mode },
    };
    update();
  });

  await refreshStatus();
};
