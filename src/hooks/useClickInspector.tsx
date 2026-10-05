import { useEffect, useRef } from 'react';
import { getFiberFromDom, getVSCodeLink } from '../utils';
import { getOpenInEditorUrl, resolveSource } from '../core';
import { InspectorMode } from '../models';

const OPEN_IN_EDITOR_ERROR = 'Dev server does not support /__open-in-editor';

export interface IUseClickInspector {
  mode: InspectorMode;
  setMode: (value: InspectorMode) => void;
  ignoredPaths?: string | string[];
  showPopup: (message?: string) => void;
  openInEditorPath?: string;
}
export const useClickInspector = ({
  mode,
  setMode,
  ignoredPaths,
  showPopup,
  openInEditorPath = '/__open-in-editor',
}: IUseClickInspector): void => {

  const latest = useRef({ ignoredPaths, showPopup, openInEditorPath, setMode });

  useEffect(() => {
    latest.current = { ignoredPaths, showPopup, openInEditorPath, setMode };
  });

  useEffect(() => {
    if (!mode) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      let currentElement: HTMLElement | null = target;

      while (currentElement) {
        if (currentElement.dataset.id === 'rci-ignore') return;

        currentElement = currentElement.parentElement as HTMLElement | null;
      }

      e.preventDefault();
      e.stopPropagation();

      const { ignoredPaths, showPopup, openInEditorPath, setMode } = latest.current;

      const fiber = getFiberFromDom(target);
      if (!fiber) {
        console.log('%c[React Inspector] No fiber found for clicked element.', 'color: gray');
        return;
      }

      const result = resolveSource(fiber, ignoredPaths);

      if (!result.ok) {
        if (result.reason === 'no-source') {
          console.warn(
            '[React Inspector] No source information found for the clicked element. ' +
              'It needs a React 18 development build with JSX source info (_debugSource); React 19 is not supported.',
          );
        }
        return;
      }

      const { filePath, line } = result;

      if (mode === 'copy') {
        navigator.clipboard.writeText(filePath);
        showPopup();
      }

      if (mode === 'vscode') {
        const vscodeUrl = getVSCodeLink(filePath, line);
        const a = document.createElement('a');
        a.href = vscodeUrl;
        a.click();
      }

      if (mode === 'webstorm') {
        fetch(getOpenInEditorUrl(window.location.origin, openInEditorPath, filePath, line))
          .then(response => {
            if (!response.ok) showPopup(OPEN_IN_EDITOR_ERROR);
          })
          .catch(() => showPopup(OPEN_IN_EDITOR_ERROR));
      }

      setMode(null);
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [mode]);
};
