# Changelog

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
