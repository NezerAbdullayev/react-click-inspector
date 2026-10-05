import { ActiveMode } from '../shared/messages';

export type EditorMode = Exclude<ActiveMode, 'copy'>;

export const LAST_EDITOR_MODE_KEY = 'lastEditorMode';
export const DEFAULT_EDITOR_MODE: EditorMode = 'vscode';

export const isEditorMode = (value: unknown): value is EditorMode =>
  value === 'vscode' || value === 'webstorm';

export const loadLastEditorMode = async (): Promise<EditorMode> => {
  const stored = await chrome.storage.local.get(LAST_EDITOR_MODE_KEY);
  const mode = stored[LAST_EDITOR_MODE_KEY];
  return isEditorMode(mode) ? mode : DEFAULT_EDITOR_MODE;
};

export const saveLastEditorMode = async (mode: EditorMode): Promise<void> => {
  await chrome.storage.local.set({ [LAST_EDITOR_MODE_KEY]: mode });
};
