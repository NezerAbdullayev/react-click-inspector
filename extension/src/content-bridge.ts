import {
  BridgeToPage,
  DEFAULT_PAGE_STATUS,
  IPageStatus,
  isPageToBridge,
  isRuntimeRequest,
  MESSAGE_SOURCE,
  RuntimeEvent,
} from './shared/messages';
import { IExtensionSettings, loadSettings, onSettingsChanged } from './shared/settings';

let cachedStatus: IPageStatus | null = null;
let currentSettings: IExtensionSettings | null = null;

const ignore = () => undefined;

const postToPage = (message: BridgeToPage) => {
  window.postMessage(message, '*');
};

const notifyRuntime = (message: unknown) => {
  Promise.resolve()
    .then(() => chrome.runtime.sendMessage(message))
    .catch(ignore);
};

const sendSettings = (settings: IExtensionSettings) => {
  currentSettings = settings;
  postToPage({ source: MESSAGE_SOURCE, type: 'settings', settings });
};

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.source !== window || !isPageToBridge(event.data)) return;
  const data = event.data;

  if (data.type === 'status') {
    const isFirstStatus = cachedStatus === null;
    cachedStatus = { hasReact: data.hasReact, hasSourceInfo: data.hasSourceInfo, mode: data.mode };
    if (isFirstStatus && currentSettings) sendSettings(currentSettings);

    const runtimeEvent: RuntimeEvent = { type: 'status', ...cachedStatus };
    notifyRuntime(runtimeEvent);
    return;
  }

  notifyRuntime(data);
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isRuntimeRequest(message)) return;

  if (message.type === 'set-mode') {
    postToPage({ source: MESSAGE_SOURCE, type: 'set-mode', mode: message.mode });
    return;
  }

  if (cachedStatus) {
    sendResponse(cachedStatus);
    return;
  }

  postToPage({ source: MESSAGE_SOURCE, type: 'ping' });
  sendResponse({ ...DEFAULT_PAGE_STATUS });
});

onSettingsChanged(sendSettings);

loadSettings().then(sendSettings, ignore);
