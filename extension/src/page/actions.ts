import { getOpenInEditorUrl, getVSCodeLink } from '../../../src/core';
import { ActiveMode } from '../shared/messages';
import { IExtensionSettings } from '../shared/settings';
import { IGNORE_ATTRIBUTE_VALUE } from './overlay';

export interface IActionTarget {
  filePath: string;
  line: number;
}

const copyWithExecCommand = (win: Window, text: string): boolean => {
  const doc = win.document;
  const textarea = doc.createElement('textarea');
  textarea.dataset.id = IGNORE_ATTRIBUTE_VALUE;
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position: fixed; top: 0; left: 0; opacity: 0; pointer-events: none;';
  const previousFocus = doc.activeElement;
  (doc.body ?? doc.documentElement).appendChild(textarea);

  try {
    textarea.select();
    return typeof doc.execCommand === 'function' && doc.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }
};

export const copyPath = async (win: Window, filePath: string): Promise<boolean> => {
  const clipboard = win.navigator.clipboard;

  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(filePath);
      return true;
    } catch {
      return copyWithExecCommand(win, filePath);
    }
  }

  return copyWithExecCommand(win, filePath);
};

export const openInVSCode = (win: Window, { filePath, line }: IActionTarget): boolean => {
  try {
    const anchor = win.document.createElement('a');
    anchor.href = getVSCodeLink(filePath, line);
    anchor.click();
    return true;
  } catch {
    return false;
  }
};

const isHtmlResponse = (response: Response): boolean =>
  (response.headers.get('content-type') ?? '').toLowerCase().includes('text/html');

export const openInWebStorm = async (
  win: Window,
  { filePath, line }: IActionTarget,
  openInEditorPath: string,
): Promise<boolean> => {
  try {
    const response = await win.fetch(getOpenInEditorUrl(win.location.origin, openInEditorPath, filePath, line));
    return response.ok && !isHtmlResponse(response);
  } catch {
    return false;
  }
};

export const runAction = (
  win: Window,
  mode: ActiveMode,
  target: IActionTarget,
  settings: IExtensionSettings,
): Promise<boolean> => {
  switch (mode) {
    case 'copy':
      return copyPath(win, target.filePath);
    case 'vscode':
      return Promise.resolve(openInVSCode(win, target));
    case 'webstorm':
      return openInWebStorm(win, target, settings.openInEditorPath);
  }
};
