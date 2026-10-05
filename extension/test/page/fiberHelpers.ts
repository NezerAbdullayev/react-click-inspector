import { IFiber, IFiberSource } from '../../../src/core';

export interface ITestFiber extends IFiber {
  type?: unknown;
  return: ITestFiber | null;
  _debugOwner?: ITestFiber | null;
}

export const createFiber = (
  source: IFiberSource | null = null,
  parent: ITestFiber | null = null,
  extra: Partial<ITestFiber> = {},
): ITestFiber => ({ return: parent, _debugSource: source, ...extra });

export const attachFiber = (element: Element, fiber: IFiber, suffix = 'test'): void => {
  (element as unknown as Record<string, unknown>)[`__reactFiber$${suffix}`] = fiber;
};

export const markContainer = (element: Element, suffix = 'test'): void => {
  (element as unknown as Record<string, unknown>)[`__reactContainer$${suffix}`] = {};
};

export const source = (fileName: string, lineNumber: number): IFiberSource => ({
  fileName,
  lineNumber,
  columnNumber: 1,
});
