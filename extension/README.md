# React Click Inspector – browser extension

Chromium (Manifest V3, Chrome 111+) version of `react-click-inspector`.

Click any element of a React 18 development build to find the component source file behind it. Nothing has to be added to the app itself.

## What it does

- The popup shows whether the page has a React dev build with source info (`_debugSource`), and lets you pick a mode: **Copy path**, **VS Code** or **WebStorm**.
- While a mode is active, hovering highlights the element with its component, file and line. Esc cancels the mode.
- Clicking an element runs the action and turns the mode off:
  - **Copy path** copies the absolute file path to the clipboard.
  - **VS Code** opens `vscode://file/<path>:<line>:1`.
  - **WebStorm** sends `GET /__open-in-editor?file=<path>:<line>:1` to the page's own dev server, which opens the file in the editor.
- A short toast on the page reports the result ("Copied", "Opening in VS Code", "Opening in WebStorm" or an error). If the clicked element has no source info, or every matching file is in the ignored paths, a toast says so and the mode stays active.
- Settings (ignored paths, open-in-editor path, highlight) are stored in `chrome.storage.sync`.

React 19 and production builds have no `_debugSource`, so the modes are disabled there.

## WebStorm requirements

WebStorm mode relies on the dev server's `/__open-in-editor` endpoint (`launch-editor-middleware`). Vite and Rsbuild dev servers provide it; static servers and production builds do not.

- If the endpoint is missing, the server returns an error or its `index.html` fallback, and the extension shows: "Dev server does not support /__open-in-editor".
- If VS Code (or another editor) opens instead of WebStorm, start the dev server with `LAUNCH_EDITOR=webstorm`.
- If the server uses a different endpoint path, change **Open-in-editor yolu (WebStorm)** in the popup settings.

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
4. Open a React 18 dev app served from `http://localhost` or `http://127.0.0.1` (any port) and click the extension icon. On other sites, use **Bu saytda aktivləşdir** in the popup to grant access.
5. The service worker log is available via **Inspect views: service worker** on the extension card.

After rebuilding, click the reload icon on the extension card and refresh the page.

## Keyboard shortcuts

- `Alt+Shift+C`: copy path mode
- `Alt+Shift+O`: open in editor mode (the editor last chosen in the popup, VS Code by default)

Recent Chromium versions may leave a suggested shortcut unassigned, for example when it conflicts with another extension or a browser shortcut. Check and set the shortcuts at `chrome://extensions/shortcuts`.
