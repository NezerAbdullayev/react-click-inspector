import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BrowserContext, chromium, expect, Page, test as base, Worker } from '@playwright/test';
import { FIXTURE_ORIGIN, LAST_OPEN_PATH } from './constants';

type Mode = 'copy' | 'vscode' | 'webstorm' | null;

export interface IPageStatus {
  hasReact: boolean;
  hasSourceInfo: boolean;
  mode: Mode;
}

export interface ISettings {
  ignoredPaths: string[];
  openInEditorPath: string;
  highlight: boolean;
}

export interface IExtensionHelpers {
  getStatus: () => Promise<IPageStatus | null>;
  setMode: (mode: Mode) => Promise<void>;
  waitForMode: (mode: Mode) => Promise<void>;
  saveSettings: (settings: Partial<ISettings>) => Promise<void>;
  openPopup: () => Promise<Page>;
}

interface IExtensionFixtures {
  serviceWorker: Worker;
  extensionId: string;
  appPage: Page;
  extension: IExtensionHelpers;
}

const EXTENSION_DIST = path.resolve(__dirname, '..', 'dist');
const FIXTURE_SRC = path.resolve(__dirname, 'fixture', 'src');
const TAB_URL_PATTERN = `${FIXTURE_ORIGIN}/*`;

export const APP_FILE = path.join(FIXTURE_SRC, 'App.tsx');
export const LIBRARY_BUTTON_FILE = path.join(FIXTURE_SRC, 'fixtures', 'LibraryButton.tsx');

export const normalizePath = (filePath: string): string => filePath.replace(/\\/g, '/');

export const findLine = (filePath: string, marker: string): number => {
  const index = readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .findIndex(line => line.includes(marker));
  if (index === -1) throw new Error(`Marker not found in ${filePath}: ${marker}`);
  return index + 1;
};

export const readLastOpen = async (page: Page): Promise<string | null> => {
  const response = await page.request.get(LAST_OPEN_PATH);
  const body: { file: string | null } = await response.json();
  return body.file;
};

export const resetLastOpen = async (page: Page): Promise<void> => {
  await page.request.delete(LAST_OPEN_PATH);
};

export const toast = (page: Page) => page.locator('.toast');

export const test = base.extend<IExtensionFixtures>({
  context: async ({ baseURL }, provide) => {
    const context: BrowserContext = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: !process.env.HEADED,
      args: [`--disable-extensions-except=${EXTENSION_DIST}`, `--load-extension=${EXTENSION_DIST}`],
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
    await provide(context);
    await context.close();
  },

  serviceWorker: async ({ context }, provide) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await provide(worker);
  },

  extensionId: async ({ serviceWorker }, provide) => {
    await provide(new URL(serviceWorker.url()).host);
  },

  extension: async ({ context, serviceWorker, extensionId }, provide) => {
    const getStatus = () =>
      serviceWorker.evaluate(async (url): Promise<IPageStatus | null> => {
        const [tab] = await chrome.tabs.query({ url });
        if (tab?.id === undefined) return null;
        try {
          return await chrome.tabs.sendMessage(tab.id, { type: 'get-status' });
        } catch {
          return null;
        }
      }, TAB_URL_PATTERN);

    const setMode = (mode: Mode) =>
      serviceWorker.evaluate(
        async ({ url, nextMode }) => {
          const [tab] = await chrome.tabs.query({ url });
          if (tab?.id === undefined) throw new Error('Fixture tab not found');
          await chrome.tabs.sendMessage(tab.id, { type: 'set-mode', mode: nextMode });
        },
        { url: TAB_URL_PATTERN, nextMode: mode },
      );

    const waitForMode = async (mode: Mode) => {
      await expect.poll(async () => (await getStatus())?.mode).toBe(mode);
    };

    const saveSettings = (settings: Partial<ISettings>) =>
      serviceWorker.evaluate(async partial => {
        const stored = await chrome.storage.sync.get('settings');
        const current = stored.settings ?? {};
        await chrome.storage.sync.set({
          settings: {
            ignoredPaths: [],
            openInEditorPath: '/__open-in-editor',
            highlight: true,
            ...current,
            ...partial,
          },
        });
      }, settings);

    const openPopup = async () => {
      const popup = await context.newPage();
      const [app] = context.pages().filter(page => page.url().startsWith(FIXTURE_ORIGIN));
      await app.bringToFront();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      return popup;
    };

    await provide({ getStatus, setMode, waitForMode, saveSettings, openPopup });
  },

  appPage: async ({ context, extension }, provide) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('/');
    await expect(page.getByTestId('counter-button')).toHaveText('Count: 0');
    await expect.poll(async () => (await extension.getStatus())?.hasSourceInfo).toBe(true);
    await provide(page);
  },
});

export { expect };
