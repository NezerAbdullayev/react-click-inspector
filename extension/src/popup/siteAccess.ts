export const BRIDGE_SCRIPT_ID = 'rci-content-bridge';
export const PAGE_INSPECTOR_SCRIPT_ID = 'rci-page-inspector';

const BRIDGE_FILE = 'content-bridge.js';
const PAGE_INSPECTOR_FILE = 'page-inspector.js';
const DEFAULT_HOSTS = ['localhost', '127.0.0.1'];

const parseUrl = (url: string | undefined): URL | null => {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

export const getOriginPattern = (url: string | undefined): string | null => {
  const parsed = parseUrl(url);
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) return null;
  return `${parsed.origin}/*`;
};

export const canEnableOnSite = (url: string | undefined): boolean => {
  const parsed = parseUrl(url);
  if (!parsed || getOriginPattern(url) === null) return false;
  return !(parsed.protocol === 'http:' && DEFAULT_HOSTS.includes(parsed.hostname));
};

const mergeMatches = (
  existing: chrome.scripting.RegisteredContentScript | undefined,
  pattern: string,
): string[] => Array.from(new Set([...(existing?.matches ?? []), pattern]));

const registerScripts = async (pattern: string) => {
  const ids = [BRIDGE_SCRIPT_ID, PAGE_INSPECTOR_SCRIPT_ID];
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids });
  const findExisting = (id: string) => existing.find(script => script.id === id);

  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: existing.map(script => script.id) });
  }

  await chrome.scripting.registerContentScripts([
    {
      id: BRIDGE_SCRIPT_ID,
      js: [BRIDGE_FILE],
      matches: mergeMatches(findExisting(BRIDGE_SCRIPT_ID), pattern),
      runAt: 'document_idle',
      world: 'ISOLATED',
      persistAcrossSessions: true,
    },
    {
      id: PAGE_INSPECTOR_SCRIPT_ID,
      js: [PAGE_INSPECTOR_FILE],
      matches: mergeMatches(findExisting(PAGE_INSPECTOR_SCRIPT_ID), pattern),
      runAt: 'document_idle',
      world: 'MAIN',
      persistAcrossSessions: true,
    },
  ]);
};

const injectScripts = async (tabId: number) => {
  await chrome.scripting.executeScript({ target: { tabId }, files: [BRIDGE_FILE], world: 'ISOLATED' });
  await chrome.scripting.executeScript({ target: { tabId }, files: [PAGE_INSPECTOR_FILE], world: 'MAIN' });
};

export type EnableResult = 'enabled' | 'denied' | 'unsupported';

export const enableOnSite = async (tabId: number, url: string | undefined): Promise<EnableResult> => {
  const pattern = getOriginPattern(url);
  if (!pattern) return 'unsupported';

  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) return 'denied';

  await registerScripts(pattern);
  await injectScripts(tabId);
  return 'enabled';
};
