import { IFiber } from './fiber';

export type ResolveResult =
  | { ok: true; filePath: string; line: number; column?: number }
  | { ok: false; reason: 'no-source' | 'all-ignored' };

const isIgnoredPath = (filePath: string, ignoredPaths?: string | string[]): boolean => {
  const isSingleIgnoredPath = typeof ignoredPaths === 'string' && filePath.includes(ignoredPaths);
  const isMultipleIgnoredPaths =
    Array.isArray(ignoredPaths) &&
    ignoredPaths.length > 0 &&
    ignoredPaths.some(path => filePath.includes(path));

  return isSingleIgnoredPath || isMultipleIgnoredPaths;
};

export const resolveSource = (fiber: IFiber, ignoredPaths?: string | string[]): ResolveResult => {
  let current: IFiber | null = fiber;
  let hasSourceInfo = false;

  while (current) {
    const source = current._debugSource;
    const filePath = source?.fileName;

    if (!source || !filePath) {
      current = current.return;
      continue;
    }

    hasSourceInfo = true;

    if (isIgnoredPath(filePath, ignoredPaths)) {
      current = current.return;
      continue;
    }

    return { ok: true, filePath, line: source.lineNumber, column: source.columnNumber };
  }

  return { ok: false, reason: hasSourceInfo ? 'all-ignored' : 'no-source' };
};
