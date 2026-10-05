export const getFiberFromDom = (dom: HTMLElement) => {
  const fiberKey = Object.keys(dom).find(key => key.startsWith('__reactFiber$'));
  return fiberKey ? (dom as any)[fiberKey] : null;
};
