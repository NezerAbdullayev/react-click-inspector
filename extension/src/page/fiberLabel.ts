import { IFiber, ResolveResult } from '../../../src/core';

interface IInspectableFiber extends IFiber {
  type?: unknown;
  return: IInspectableFiber | null;
  _debugOwner?: IInspectableFiber | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getTypeName = (type: unknown, depth = 0): string | null => {
  if (depth > 5) return null;

  if (typeof type === 'function') {
    const named = type as { displayName?: unknown; name?: unknown };
    if (typeof named.displayName === 'string' && named.displayName) return named.displayName;
    return typeof named.name === 'string' && named.name ? named.name : null;
  }

  if (isRecord(type)) {
    if (typeof type.displayName === 'string' && type.displayName) return type.displayName;
    return getTypeName(type.type, depth + 1) ?? getTypeName(type.render, depth + 1);
  }

  return null;
};

const findNearestComponentName = (fiber: IInspectableFiber | null): string | null => {
  let current = fiber;

  while (current) {
    const name = getTypeName(current.type);
    if (name) return name;
    current = current.return;
  }

  return null;
};

export const getComponentName = (
  fiber: IFiber,
  filePath: string,
  line: number,
): string | null => {
  let current: IInspectableFiber | null = fiber as IInspectableFiber;

  while (current) {
    const source = current._debugSource;
    if (source?.fileName === filePath && source.lineNumber === line) {
      return getTypeName(current._debugOwner?.type) ?? findNearestComponentName(current.return);
    }
    current = current.return;
  }

  return null;
};

export const shortenPath = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/');
  const srcIndex = normalized.lastIndexOf('/src/');
  if (srcIndex >= 0) return normalized.slice(srcIndex + 1);
  return normalized.split('/').pop() || normalized;
};

export const formatLabel = (
  element: Element,
  fiber: IFiber | null,
  result: ResolveResult | null,
): string => {
  const tagName = element.tagName.toLowerCase();

  if (!fiber || !result) return tagName;
  if (!result.ok) return `${tagName} · ${result.reason === 'no-source' ? 'no source' : 'ignored'}`;

  const location = `${shortenPath(result.filePath)}:${result.line}`;
  const name = getComponentName(fiber, result.filePath, result.line);
  return name ? `${name} · ${location}` : location;
};
