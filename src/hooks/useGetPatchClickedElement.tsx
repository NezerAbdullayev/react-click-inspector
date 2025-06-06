import { useEffect } from 'react';
import { getFiberFromDom, getVSCodeLink, IdeType } from '../utils';

export interface IUseGetPatchClickedElement {
  setOpenInVSCode: (value: boolean) => void;
  ignoredPaths?: string | string[];
  openInVSCode: boolean;
  setLogOnly: (value: boolean) => void;
  setIDEType?: (value: string) => void;
  showPopup: () => void;
  logOnly?: boolean;
  IDEType?: IdeType | undefined;
}
export const useGetPatchClickedElement = ({
  setOpenInVSCode,
  setLogOnly,
  openInVSCode,
  ignoredPaths,
  showPopup,
  logOnly,
  IDEType,
}: IUseGetPatchClickedElement): void => {

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    let currentElement: HTMLElement | null = target;

    while (currentElement) {
      if (currentElement.dataset.id === 'continue-element_debbug') return;

      currentElement = currentElement.parentElement as HTMLElement | null;
    }

    const fiber = getFiberFromDom(target);
    if (!fiber) {
      console.log('%c[React Inspector] No fiber found for clicked element.', 'color: gray');
      return;
    }

    let current = fiber;
    const printed = new Set();

    while (current) {
      const source = current._debugSource;
      const filePath = source?.fileName;

      if (!filePath) {
        current = current.return;
        continue;
      }

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

      if (logOnly) {
        navigator.clipboard.writeText(filePath);
        showPopup();
        setLogOnly(false);
      }

      if (openInVSCode) {
        const vscodeUrl = getVSCodeLink(filePath, source.lineNumber, IDEType);
        const a = document.createElement('a');
        a.href = vscodeUrl;
        a.click();
        setOpenInVSCode(false);
      }

      break;
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [logOnly, openInVSCode]);
};
