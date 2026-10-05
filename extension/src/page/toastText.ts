import { ActiveMode, FailReason } from '../shared/messages';

export const SUCCESS_TOAST: Record<ActiveMode, string> = {
  copy: 'Copied',
  vscode: 'Opening in VS Code',
  webstorm: 'Opening in WebStorm',
};

export const EDITOR_FAILED_TOAST: Record<ActiveMode, string> = {
  copy: 'Could not copy the path to the clipboard',
  vscode: 'Could not open VS Code',
  webstorm:
    'Dev server does not support /__open-in-editor (Vite and Rsbuild do). ' +
    'Set LAUNCH_EDITOR=webstorm if VS Code opens instead.',
};

export const FAIL_TOAST: Partial<Record<FailReason, string>> = {
  'no-source': 'No source info (React 19 or production build?)',
  'all-ignored': 'All matching files are in ignoredPaths',
};
