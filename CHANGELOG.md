# Changelog

## Unreleased

### Added
- **WebStorm** mode: opens the clicked component's file through the dev server's `/__open-in-editor` endpoint (Vite, Rsbuild). Use `LAUNCH_EDITOR=webstorm` to make the dev server pick WebStorm.
- `openInEditorPath` prop (default `/__open-in-editor`).
- `InspectorMode` now includes `'webstorm'`.
- Error popup "Dev server does not support /__open-in-editor" when the WebStorm request fails.

### Changed
- "Copy file path", "VSCode" and "WebStorm" modes are mutually exclusive.

### Removed
- The internal `jetbrains://` link path is no longer used; it did not open WebStorm.

## 1.1.0

### Added
- `enabled` prop to turn the inspector on or off explicitly (defaults to localhost detection).
- `Escape` cancels the active inspect mode.
- Console warning when the clicked element has no source information (e.g. React 19 or a production build).
- `InspectorMode` type export.

### Changed
- "Copy file path" and "VSCode" modes are now mutually exclusive.
- While a mode is active, the inspected click no longer triggers links, forms or app handlers.
- The app is no longer wrapped in an extra `<div>`; the crosshair cursor is set on `<body>`.

### Fixed
- Type declaration build (missing `@types/react`).
- README import example; a default export is now provided as well.
- Stale `ignoredPaths` / IDE settings in the click handler and overlapping popup timers.

### Internal
- ESLint (with `eslint-plugin-react-hooks`), Vitest + Testing Library tests and a GitHub Actions CI workflow.
- MIT `LICENSE` file.

## 1.0.4
- Dynamic cursor while inspecting.
