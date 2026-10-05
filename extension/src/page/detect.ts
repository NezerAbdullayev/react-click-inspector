import { getFiberFromDom, IFiber } from '../../../src/core';

export interface IReactDetection {
  hasReact: boolean;
  hasSourceInfo: boolean;
}

const CONTAINER_KEY_PREFIX = '__reactContainer$';
const CONTAINER_CANDIDATE_SELECTORS = ['#root', '[data-reactroot]', '#app', '#__next'];

const isReactContainer = (element: Element): boolean =>
  Object.keys(element).some(key => key.startsWith(CONTAINER_KEY_PREFIX));

export const findReactContainers = (doc: Document): Element[] => {
  const containers = new Set<Element>();

  CONTAINER_CANDIDATE_SELECTORS.forEach(selector => {
    doc.querySelectorAll(selector).forEach(element => {
      if (isReactContainer(element)) containers.add(element);
    });
  });

  if (containers.size === 0) {
    doc.querySelectorAll('*').forEach(element => {
      if (isReactContainer(element)) containers.add(element);
    });
  }

  return Array.from(containers);
};

export const findFirstFiber = (container: Element): IFiber | null => {
  for (const element of Array.from(container.querySelectorAll('*'))) {
    const fiber = getFiberFromDom(element as HTMLElement);
    if (fiber) return fiber;
  }

  return null;
};

export const hasSourceInChain = (fiber: IFiber | null): boolean => {
  let current = fiber;

  while (current) {
    if (current._debugSource?.fileName) return true;
    current = current.return;
  }

  return false;
};

export const detectReact = (doc: Document): IReactDetection => {
  const containers = findReactContainers(doc);

  return {
    hasReact: containers.length > 0,
    hasSourceInfo: containers.some(container => hasSourceInChain(findFirstFiber(container))),
  };
};
