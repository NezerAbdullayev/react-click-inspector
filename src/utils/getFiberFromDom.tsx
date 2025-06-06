export const getFiberFromDom = (dom: HTMLElement) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const key in dom) {
    if (key.startsWith('__reactFiber$')) {
      return (dom as any)[key];
    }
  }
  return null;
};
