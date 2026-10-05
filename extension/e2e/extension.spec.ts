import {
  APP_FILE,
  expect,
  findLine,
  LIBRARY_BUTTON_FILE,
  normalizePath,
  readLastOpen,
  resetLastOpen,
  test,
  toast,
} from './extensionTest';

const COUNTER_LINE_MARKER = 'data-testid="counter-button"';
const LINK_LINE_MARKER = '<a href="#docs"';
const LIBRARY_USAGE_MARKER = '<LibraryButton testId="library-button"';

const expectedVSCodeLink = (filePath: string, line: number) =>
  `vscode://file/${normalizePath(filePath)}:${line}:1`;

test.describe('React Click Inspector extension', () => {
  test('popup shows that a React dev build was found', async ({ appPage, extension }) => {
    const popup = await extension.openPopup();

    await expect(popup.locator('[data-role="status"]')).toHaveText('React dev build tapıldı');
    await expect(popup.locator('button[data-mode="copy"]')).toBeEnabled();
    await expect(appPage.getByTestId('counter-button')).toHaveText('Count: 0');
  });

  test('copy mode from the popup copies the file path and consumes the click', async ({ appPage, extension }) => {
    const popup = await extension.openPopup();
    await expect(popup.locator('button[data-mode="copy"]')).toBeEnabled();
    await popup.locator('button[data-mode="copy"]').click();
    await extension.waitForMode('copy');

    await appPage.bringToFront();
    await appPage.getByTestId('counter-button').click();

    await expect(toast(appPage)).toHaveText('Copied');
    await expect(appPage.getByTestId('counter-button')).toHaveText('Count: 0');
    const copied = await appPage.evaluate(() => navigator.clipboard.readText());
    expect(normalizePath(copied)).toBe(normalizePath(APP_FILE));
    await extension.waitForMode(null);

    await appPage.getByTestId('counter-button').click();
    await expect(appPage.getByTestId('counter-button')).toHaveText('Count: 1');
  });

  test('vscode mode opens a vscode:// link with the source line', async ({ appPage, extension }) => {
    await appPage.evaluate(() => {
      const recorded: string[] = [];
      Object.defineProperty(window, '__rciOpenedLinks', { value: recorded });
      HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
        recorded.push(this.href);
      };
    });
    const openedLinks = () =>
      appPage.evaluate(() => (window as Window & { __rciOpenedLinks?: string[] }).__rciOpenedLinks ?? []);

    await extension.setMode('vscode');
    await extension.waitForMode('vscode');
    await appPage.getByTestId('counter-button').click();

    await expect(toast(appPage)).toHaveText('Opening in VS Code');
    await expect(appPage.getByTestId('counter-button')).toHaveText('Count: 0');
    expect(await openedLinks()).toEqual([expectedVSCodeLink(APP_FILE, findLine(APP_FILE, COUNTER_LINE_MARKER))]);

    await extension.setMode('vscode');
    await extension.waitForMode('vscode');
    await appPage.getByTestId('docs-link').click();

    await expect.poll(openedLinks).toHaveLength(2);
    expect((await openedLinks())[1]).toBe(expectedVSCodeLink(APP_FILE, findLine(APP_FILE, LINK_LINE_MARKER)));
    expect(await appPage.evaluate(() => window.location.hash)).toBe('');
  });

  test('webstorm mode sends the file and line to /__open-in-editor', async ({ appPage, extension }) => {
    await resetLastOpen(appPage);

    await extension.setMode('webstorm');
    await extension.waitForMode('webstorm');
    await appPage.getByTestId('counter-button').click();

    await expect(toast(appPage)).toHaveText('Opening in WebStorm');
    await expect(appPage.getByTestId('counter-button')).toHaveText('Count: 0');
    const opened = await readLastOpen(appPage);
    expect(normalizePath(opened ?? '')).toBe(
      `${normalizePath(APP_FILE)}:${findLine(APP_FILE, COUNTER_LINE_MARKER)}:1`,
    );
  });

  test('ignoredPaths from the popup resolve to the parent component file', async ({ appPage, extension }) => {
    await extension.setMode('copy');
    await extension.waitForMode('copy');
    await appPage.getByTestId('library-button').click();
    await expect(toast(appPage)).toHaveText('Copied');
    expect(normalizePath(await appPage.evaluate(() => navigator.clipboard.readText()))).toBe(
      normalizePath(LIBRARY_BUTTON_FILE),
    );

    const popup = await extension.openPopup();
    const ignoredInput = popup.locator('input[name="ignoredPaths"]');
    await ignoredInput.fill('fixtures');
    await ignoredInput.press('Enter');
    await expect(popup.locator('[data-role="saved"]')).toBeVisible();

    await appPage.bringToFront();
    await resetLastOpen(appPage);
    await extension.setMode('webstorm');
    await extension.waitForMode('webstorm');
    await appPage.getByTestId('library-button').click();

    await expect(toast(appPage)).toHaveText('Opening in WebStorm');
    await expect(appPage.getByTestId('library-button')).toHaveText('Library clicks: 0');
    const opened = await readLastOpen(appPage);
    expect(normalizePath(opened ?? '')).toBe(
      `${normalizePath(APP_FILE)}:${findLine(APP_FILE, LIBRARY_USAGE_MARKER)}:1`,
    );
  });

  test('Escape cancels the active mode', async ({ appPage, extension }) => {
    await extension.setMode('copy');
    await extension.waitForMode('copy');

    await appPage.keyboard.press('Escape');
    await extension.waitForMode(null);

    await appPage.getByTestId('counter-button').click();
    await expect(appPage.getByTestId('counter-button')).toHaveText('Count: 1');
    await expect(toast(appPage)).toBeHidden();
  });

  test('shows an error toast when openInEditorPath returns index.html', async ({ appPage, extension }) => {
    await extension.saveSettings({ openInEditorPath: '/not-an-editor-endpoint' });
    await resetLastOpen(appPage);

    await extension.setMode('webstorm');
    await extension.waitForMode('webstorm');
    await appPage.getByTestId('counter-button').click();

    await expect(toast(appPage)).toContainText('Dev server does not support /__open-in-editor');
    await expect(toast(appPage)).toHaveAttribute('data-tone', 'error');
    expect(await readLastOpen(appPage)).toBeNull();
  });

  test('shortcut command path activates copy mode from the service worker', async ({
    appPage,
    extension,
    serviceWorker,
  }) => {
    const commands = await serviceWorker.evaluate(async () =>
      (await chrome.commands.getAll()).map(command => command.name),
    );
    expect(commands).toEqual(expect.arrayContaining(['activate-copy', 'activate-editor']));

    await extension.setMode('copy');
    await extension.waitForMode('copy');
    await appPage.getByTestId('counter-button').click();

    await expect(toast(appPage)).toHaveText('Copied');
    await expect(appPage.getByTestId('counter-button')).toHaveText('Count: 0');
  });
});
