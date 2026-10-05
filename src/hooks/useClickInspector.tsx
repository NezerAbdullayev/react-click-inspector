import { useEffect, useRef } from 'react';
import { getFiberFromDom, getVSCodeLink, IdeType, IFiber } from '../utils';
import { InspectorMode } from '../models';

export interface IUseClickInspector {
  mode: InspectorMode;
  setMode: (value: InspectorMode) => void;
  ignoredPaths?: string | string[];
  showPopup: () => void;
  IDEType?: IdeType | undefined;
}
export const useClickInspector = ({
  mode,
  setMode,
  ignoredPaths,
  showPopup,
  IDEType,
}: IUseClickInspector): void => {

  const latest = useRef({ ignoredPaths, showPopup, IDEType, setMode });

  useEffect(() => {
    latest.current = { ignoredPaths, showPopup, IDEType, setMode };
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

      const { ignoredPaths, showPopup, IDEType, setMode } = latest.current;

      const fiber = getFiberFromDom(target);
      if (!fiber) {
        console.log('%c[React Inspector] No fiber found for clicked element.', 'color: gray');
        return;
      }

      let current: IFiber | null = fiber;
      let hasSourceInfo = false;
      const printed = new Set();

      while (current) {
        const source = current._debugSource;
        const filePath = source?.fileName;

        if (!source || !filePath) {
          current = current.return;
          continue;
        }

        hasSourceInfo = true;

        const isSingleIgnoredPath =
          typeof ignoredPaths === 'string' && filePath.includes(ignoredPaths);
        const isMultipleIgnoredPaths =
          Array.isArray(ignoredPaths) &&
          ignoredPaths.length > 0 &&
          ignoredPaths.some(path => filePath.includes(path));

        if (isSingleIgnoredPath || isMultipleIgnoredPaths) {
          current = current.return;
          continue;
        }

        const key = `${filePath}:${source?.lineNumber}:${source?.columnNumber}`;
        if (printed.has(key)) {
          current = current.return;
          continue;
        }

        printed.add(key);

        if (mode === 'copy') {
          navigator.clipboard.writeText(filePath);
          showPopup();
        }

        if (mode === 'vscode') {
          const vscodeUrl = getVSCodeLink(filePath, source.lineNumber, IDEType);
          const a = document.createElement('a');
          a.href = vscodeUrl;
          a.click();
        }

        setMode(null);
        return;
      }

      if (!hasSourceInfo) {
        console.warn(
          '[React Inspector] No source information found for the clicked element. ' +
            'It needs a React 18 development build with JSX source info (_debugSource); React 19 is not supported.',
        );
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [mode]);
};
