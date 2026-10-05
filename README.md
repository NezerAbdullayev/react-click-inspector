# react-click-inspector

A lightweight React developer tool: click any element in your running app and instantly copy the path of the component file that rendered it, or open that file at the exact line in **VS Code** or **WebStorm**.

![Click Inspector Demo](./image.png)

## ✨ Features

- 📋 **Copy file path** of the clicked element's component to the clipboard
- 🧭 **Open in VS Code** at the exact file and line number
- 🧠 **Open in WebStorm** through your dev server's `/__open-in-editor` endpoint (Vite, Rsbuild)
- 🙈 **Ignore paths** (shared components, libraries) so the inspector jumps to *your* code
- 🔒 **Localhost only**: the inspector is not rendered anywhere else, so it is safe to leave in your code
- 🎨 Customizable toggle button and settings panel

## 📦 Installation

```bash
npm install --save-dev react-click-inspector
```

or

```bash
yarn add -D react-click-inspector
```

## 🚀 Usage

Wrap the root of your application (e.g. in `main.tsx` or `App.tsx`) with `ReactClickInspector`:

```tsx
import React from "react";
import { ReactClickInspector } from "react-click-inspector";
import App from "./App";

const Root = () => (
  <ReactClickInspector ignoredPaths={["fe-common", "common/myLibrary"]}>
    <App />
  </ReactClickInspector>
);

export default Root;
```

A default export is also available:

```tsx
import ReactClickInspector from "react-click-inspector";
```

### How to use it in the browser

1. Click the toggle button in the bottom-right corner to open the **Settings** panel.
2. Choose a mode:
   - **Copy file path to Clipboard**: the next click copies the component's file path.
   - **VSCode**: the next click opens the component's file at the right line in VS Code.
   - **WebStorm**: the next click asks your dev server to open the file at the right line in WebStorm (see [Open in WebStorm](#-open-in-webstorm)).
3. Click any element in your app. The mode turns off automatically after one click.

Only one mode is active at a time. While a mode is active, the click is used by the inspector only: links, forms and your app's click handlers don't fire. Press **Escape** to cancel the active mode.

## ⚙️ Props

| Prop           | Type                  | Default     | Description                                                                                    |
| -------------- | --------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `children`     | `ReactNode`           | (required)  | Your application.                                                                              |
| `enabled`      | `boolean`             | localhost   | Turns the inspector on or off. By default it is enabled only on `localhost`, `127.0.0.1` or `::1`. |
| `ignoredPaths` | `string \| string[]`  | `undefined` | File paths containing any of these strings are skipped, and the next parent component is used. |
| `icon`         | `ReactNode`           | arrow icon  | Custom content for the toggle button.                                                          |
| `toggleBtnCss` | `CSSProperties`       | `undefined` | Style overrides for the toggle button.                                                         |
| `modalCss`     | `CSSProperties`       | `undefined` | Style overrides for the settings panel.                                                        |
| `openInEditorPath` | `string`          | `"/__open-in-editor"` | Dev server endpoint used by the WebStorm mode. The request is sent to the app's own origin. |

## 🧠 Open in WebStorm

The WebStorm mode sends `GET <origin><openInEditorPath>?file=<absolute path>:<line>:1` to the dev server that serves your app. The dev server then launches the editor.

- It needs a dev server with the `/__open-in-editor` endpoint (`launch-editor-middleware`). **Vite** and **Rsbuild** dev servers have it built in. If your dev server serves it on another path, set `openInEditorPath`.
- The dev server picks the editor itself (usually the one that is running). To always open WebStorm, start the dev server with `LAUNCH_EDITOR=webstorm`, e.g. `LAUNCH_EDITOR=webstorm npm run dev` (on Windows: `set LAUNCH_EDITOR=webstorm` in cmd or `$env:LAUNCH_EDITOR="webstorm"` in PowerShell). The `webstorm` command must be on your `PATH`; otherwise set `LAUNCH_EDITOR` to the full path of the WebStorm executable.
- If the request fails or the server answers with an error status, the inspector shows "Dev server does not support /__open-in-editor". A dev server that answers unknown paths with `index.html` (status 200) is not detected, so nothing happens in that case.

## 📋 Requirements

- **React 18** (`react` and `react-dom` `^18.0.0`).
- A **development build**. The inspector reads source locations from React's `_debugSource`, which is only present in development mode when JSX source info is enabled (Vite with `@vitejs/plugin-react`, Create React App and Next.js do this by default in dev).
- By default the app must run on **`localhost`**, `127.0.0.1` or `::1`; on any other host the inspector renders only `children`. Use the `enabled` prop to change this, e.g. `enabled={process.env.NODE_ENV === "development"}` for a LAN IP or custom dev domain.
- To open files from the browser, VS Code must be installed and registered as the handler for `vscode://` links (the default after installation).
- The WebStorm mode needs a dev server with the `/__open-in-editor` endpoint (Vite, Rsbuild).

> ⚠️ React 19 removed `_debugSource`, so it is not supported yet. When no source information is found, the inspector logs a warning in the console.

## 🛠 Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## 📄 License

MIT © Nezer Abdullayev
