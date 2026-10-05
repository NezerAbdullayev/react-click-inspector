import { beforeEach, vi } from 'vitest';

type AnyListener = (...args: never[]) => unknown;

export interface IMockEvent<T extends AnyListener> {
  addListener: (listener: T) => void;
  removeListener: (listener: T) => void;
  hasListener: (listener: T) => boolean;
  hasListeners: () => boolean;
  listeners: () => T[];
  dispatch: (...args: Parameters<T>) => unknown[];
  clear: () => void;
}

export const createMockEvent = <T extends AnyListener>(): IMockEvent<T> => {
  const listeners = new Set<T>();

  return {
    addListener: listener => {
      listeners.add(listener);
    },
    removeListener: listener => {
      listeners.delete(listener);
    },
    hasListener: listener => listeners.has(listener),
    hasListeners: () => listeners.size > 0,
    listeners: () => Array.from(listeners),
    dispatch: (...args) => Array.from(listeners).map(listener => listener(...args)),
    clear: () => listeners.clear(),
  };
};

export const NO_RECEIVER_ERROR = 'Could not establish connection. Receiving end does not exist.';

type StorageChanges = Record<string, chrome.storage.StorageChange>;
type StorageAreaName = 'sync' | 'local';
type StorageKeys = string | string[] | Record<string, unknown> | null | undefined;

type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => unknown;

export interface IDispatchedMessage {
  sendResponse: ReturnType<typeof vi.fn<(response?: unknown) => void>>;
  results: unknown[];
}

const clone = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);

const createStorageArea = (
  areaName: StorageAreaName,
  onAnyChanged: IMockEvent<(changes: StorageChanges, areaName: string) => void>,
) => {
  const data = new Map<string, unknown>();
  const onChanged = createMockEvent<(changes: StorageChanges) => void>();

  const emit = (changes: StorageChanges) => {
    if (Object.keys(changes).length === 0) return;
    onChanged.dispatch(changes);
    onAnyChanged.dispatch(changes, areaName);
  };

  const read = (keys: StorageKeys): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    if (keys === null || keys === undefined) {
      data.forEach((value, key) => {
        result[key] = clone(value);
      });
      return result;
    }

    if (typeof keys === 'string' || Array.isArray(keys)) {
      (typeof keys === 'string' ? [keys] : keys).forEach(key => {
        if (data.has(key)) result[key] = clone(data.get(key));
      });
      return result;
    }

    Object.entries(keys).forEach(([key, fallback]) => {
      result[key] = data.has(key) ? clone(data.get(key)) : fallback;
    });
    return result;
  };

  const write = (items: Record<string, unknown>) => {
    const changes: StorageChanges = {};
    Object.entries(items).forEach(([key, value]) => {
      const oldValue = data.get(key);
      const newValue = clone(value);
      data.set(key, newValue);
      changes[key] = { oldValue: clone(oldValue), newValue: clone(newValue) };
    });
    emit(changes);
  };

  const removeKeys = (keys: string | string[]) => {
    const changes: StorageChanges = {};
    (typeof keys === 'string' ? [keys] : keys).forEach(key => {
      if (!data.has(key)) return;
      changes[key] = { oldValue: clone(data.get(key)) };
      data.delete(key);
    });
    emit(changes);
  };

  const clearAll = () => {
    const changes: StorageChanges = {};
    data.forEach((value, key) => {
      changes[key] = { oldValue: clone(value) };
    });
    data.clear();
    emit(changes);
  };

  return {
    data,
    onChanged,
    get: vi.fn(async (keys?: StorageKeys) => read(keys)),
    set: vi.fn(async (items: Record<string, unknown>) => write(items)),
    remove: vi.fn(async (keys: string | string[]) => removeKeys(keys)),
    clear: vi.fn(async () => clearAll()),
  };
};

export const createTab = (overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab => ({
  id: 1,
  index: 0,
  windowId: 1,
  url: 'http://localhost:5173/',
  title: 'Test page',
  active: true,
  highlighted: true,
  pinned: false,
  incognito: false,
  selected: true,
  discarded: false,
  autoDiscardable: true,
  frozen: false,
  groupId: -1,
  lastAccessed: 0,
  ...overrides,
});

const createChromeMock = () => {
  const storageOnChanged = createMockEvent<(changes: StorageChanges, areaName: string) => void>();
  const runtimeOnMessage = createMockEvent<MessageListener>();
  const registeredScripts = new Map<string, chrome.scripting.RegisteredContentScript>();
  const grantedOrigins = new Set<string>();
  const permissionsOnAdded = createMockEvent<(permissions: chrome.permissions.Permissions) => void>();
  const permissionsOnRemoved = createMockEvent<(permissions: chrome.permissions.Permissions) => void>();

  const dispatchMessage = (
    message: unknown,
    sender: chrome.runtime.MessageSender = {},
  ): IDispatchedMessage => {
    const sendResponse = vi.fn<(response?: unknown) => void>();
    const results = runtimeOnMessage.dispatch(message, sender, sendResponse);
    return { sendResponse, results };
  };

  return {
    runtime: {
      id: 'rci-test-extension',
      lastError: undefined as chrome.runtime.LastError | undefined,
      getURL: vi.fn((path: string) => `chrome-extension://rci-test-extension/${path.replace(/^\//, '')}`),
      sendMessage: vi.fn<(message: unknown) => Promise<unknown>>(async () => undefined),
      onMessage: runtimeOnMessage,
      onInstalled: createMockEvent<(details: chrome.runtime.InstalledDetails) => void>(),
      dispatchMessage,
    },
    tabs: {
      sendMessage: vi.fn<(tabId: number, message: unknown) => Promise<unknown>>(async () => undefined),
      query: vi.fn<(queryInfo: chrome.tabs.QueryInfo) => Promise<chrome.tabs.Tab[]>>(async () => [
        createTab(),
      ]),
      get: vi.fn(async (tabId: number): Promise<chrome.tabs.Tab> => createTab({ id: tabId })),
      onActivated: createMockEvent<(activeInfo: chrome.tabs.OnActivatedInfo) => void>(),
      onUpdated: createMockEvent<
        (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => void
      >(),
      onRemoved: createMockEvent<(tabId: number, removeInfo: chrome.tabs.OnRemovedInfo) => void>(),
    },
    storage: {
      sync: createStorageArea('sync', storageOnChanged),
      local: createStorageArea('local', storageOnChanged),
      onChanged: storageOnChanged,
    },
    commands: {
      getAll: vi.fn(async (): Promise<chrome.commands.Command[]> => []),
      onCommand: createMockEvent<(command: string, tab?: chrome.tabs.Tab) => void>(),
    },
    action: {
      setBadgeText: vi.fn<(details: chrome.action.BadgeTextDetails) => Promise<void>>(async () => {}),
      setBadgeBackgroundColor: vi.fn<(details: chrome.action.BadgeColorDetails) => Promise<void>>(
        async () => {},
      ),
      setTitle: vi.fn<(details: chrome.action.TitleDetails) => Promise<void>>(async () => {}),
    },
    scripting: {
      registered: registeredScripts,
      registerContentScripts: vi.fn(async (scripts: chrome.scripting.RegisteredContentScript[]) => {
        scripts.forEach(script => {
          if (registeredScripts.has(script.id)) {
            throw new Error(`Duplicate script ID '${script.id}'`);
          }
        });
        scripts.forEach(script => registeredScripts.set(script.id, { ...script }));
      }),
      unregisterContentScripts: vi.fn(async (filter?: chrome.scripting.ContentScriptFilter) => {
        const ids = filter?.ids ?? Array.from(registeredScripts.keys());
        ids.forEach(id => registeredScripts.delete(id));
      }),
      getRegisteredContentScripts: vi.fn(
        async (filter?: chrome.scripting.ContentScriptFilter): Promise<chrome.scripting.RegisteredContentScript[]> =>
          Array.from(registeredScripts.values()).filter(
            script => !filter?.ids || filter.ids.includes(script.id),
          ),
      ),
      executeScript: vi.fn<
        (injection: chrome.scripting.ScriptInjection<unknown[], unknown>) => Promise<unknown[]>
      >(async () => []),
      insertCSS: vi.fn<(injection: chrome.scripting.CSSInjection) => Promise<void>>(async () => {}),
    },
    permissions: {
      granted: grantedOrigins,
      contains: vi.fn(async (permissions: chrome.permissions.Permissions) =>
        (permissions.origins ?? []).every(origin => grantedOrigins.has(origin)),
      ),
      request: vi.fn(async (permissions: chrome.permissions.Permissions) => {
        (permissions.origins ?? []).forEach(origin => grantedOrigins.add(origin));
        permissionsOnAdded.dispatch(permissions);
        return true;
      }),
      remove: vi.fn(async (permissions: chrome.permissions.Permissions) => {
        (permissions.origins ?? []).forEach(origin => grantedOrigins.delete(origin));
        permissionsOnRemoved.dispatch(permissions);
        return true;
      }),
      getAll: vi.fn(async (): Promise<chrome.permissions.Permissions> => ({
        origins: Array.from(grantedOrigins),
        permissions: [],
      })),
      onAdded: permissionsOnAdded,
      onRemoved: permissionsOnRemoved,
    },
  };
};

export type ChromeMock = ReturnType<typeof createChromeMock>;

let current: ChromeMock = createChromeMock();

const install = (mock: ChromeMock) => {
  Object.defineProperty(globalThis, 'chrome', {
    value: mock,
    configurable: true,
    writable: true,
  });
};

export const getChromeMock = (): ChromeMock => current;

export const resetChromeMock = (): ChromeMock => {
  current = createChromeMock();
  install(current);
  return current;
};

install(current);

beforeEach(() => {
  resetChromeMock();
});
