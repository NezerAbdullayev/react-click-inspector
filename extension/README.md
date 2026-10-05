# React Click Inspector – browser extension

Chromium (Manifest V3, Chrome 111+) version of `react-click-inspector`.

## Build

Run from the repository root:

```bash
npm install
npm run ext:build   # one-off build into extension/dist
npm run ext:watch   # rebuild on changes
npm run ext:test    # unit tests (Vitest + jsdom, chrome.* mocked)
```

## Load unpacked

1. Run `npm run ext:build`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the `extension/dist` folder.
4. Open an app served from `http://localhost` or `http://127.0.0.1` (any port). The page console shows `[react-click-inspector] content-bridge loaded` and `[react-click-inspector] page-inspector loaded`.
5. The service worker log is available via **Inspect views: service worker** on the extension card.

After rebuilding, click the reload icon on the extension card and refresh the page.

## Keyboard shortcuts

- `Alt+Shift+C`: copy path mode
- `Alt+Shift+O`: open in editor mode

Shortcuts can be changed at `chrome://extensions/shortcuts`.
