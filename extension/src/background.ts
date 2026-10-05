import { InspectorMode, isRuntimeEvent, RuntimeRequest } from './shared/messages';
import { isEditorMode, loadLastEditorMode, saveLastEditorMode } from './popup/lastEditorMode';

const BADGE_COLOR = '#4caf50';

const ignore = () => undefined;

const getTargetTabId = async (tab?: chrome.tabs.Tab): Promise<number | undefined> => {
  if (tab?.id !== undefined) return tab.id;
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id;
};

const getCommandMode = async (command: string): Promise<InspectorMode | undefined> => {
  if (command === 'activate-copy') return 'copy';
  if (command === 'activate-editor') return loadLastEditorMode();
  return undefined;
};

const handleCommand = async (command: string, tab?: chrome.tabs.Tab) => {
  const mode = await getCommandMode(command);
  if (mode === undefined) return;

  const tabId = await getTargetTabId(tab);
  if (tabId === undefined) return;

  const request: RuntimeRequest = { type: 'set-mode', mode };
  await chrome.tabs.sendMessage(tabId, request);
};

chrome.commands.onCommand.addListener((command, tab) => {
  handleCommand(command, tab).catch(ignore);
});

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  if (!isRuntimeEvent(message)) return;

  const tabId = sender.tab?.id;
  if (tabId !== undefined) {
    chrome.action.setBadgeText({ tabId, text: message.mode ? 'ON' : '' }).catch(ignore);
  }

  if (isEditorMode(message.mode)) {
    saveLastEditorMode(message.mode).catch(ignore);
  }
});

chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR }).catch(ignore);
