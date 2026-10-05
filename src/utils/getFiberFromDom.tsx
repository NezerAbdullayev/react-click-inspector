export interface IFiberSource {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
}

export interface IFiber {
  return: IFiber | null;
  _debugSource?: IFiberSource | null;
}

export const getFiberFromDom = (dom: HTMLElement): IFiber | null => {
  const fiberKey = Object.keys(dom).find(key => key.startsWith('__reactFiber$'));
  return fiberKey ? (dom as unknown as Record<string, IFiber>)[fiberKey] : null;
};
