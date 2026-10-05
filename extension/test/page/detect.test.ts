import { afterEach, describe, expect, it } from 'vitest';
import {
  detectReact,
  findFirstFiber,
  findReactContainers,
  hasSourceInChain,
} from '../../src/page/detect';
import { attachFiber, createFiber, markContainer, source } from './fiberHelpers';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('detectReact', () => {
  it('reports no React on a plain page', () => {
    document.body.innerHTML = '<div id="root"><p>Hello</p></div>';

    expect(detectReact(document)).toEqual({ hasReact: false, hasSourceInfo: false });
  });

  it('finds the container by __reactContainer$ and the fiber in its children', () => {
    document.body.innerHTML = '<div id="root"><main><button>Go</button></main></div>';
    const root = document.getElementById('root')!;
    markContainer(root);
    const appFiber = createFiber(source('/app/src/main.tsx', 5));
    attachFiber(document.querySelector('button')!, createFiber(null, appFiber));

    expect(findReactContainers(document)).toEqual([root]);
    expect(detectReact(document)).toEqual({ hasReact: true, hasSourceInfo: true });
  });

  it('ignores a __reactFiber$ on the container itself', () => {
    document.body.innerHTML = '<div id="root"><span></span></div>';
    const root = document.getElementById('root')!;
    markContainer(root);
    attachFiber(root, createFiber(source('/app/src/App.tsx', 1)));

    expect(findFirstFiber(root)).toBeNull();
    expect(detectReact(document)).toEqual({ hasReact: true, hasSourceInfo: false });
  });

  it('reports React without source info when no fiber in the chain has _debugSource', () => {
    document.body.innerHTML = '<div id="root"><div><span>Hi</span></div></div>';
    markContainer(document.getElementById('root')!);
    const rootFiber = createFiber(null, null);
    attachFiber(document.querySelector('div > div')!, createFiber(null, createFiber(null, rootFiber)));

    expect(detectReact(document)).toEqual({ hasReact: true, hasSourceInfo: false });
  });

  it('finds containers that are not #root', () => {
    document.body.innerHTML = '<section class="mount"><b>x</b></section>';
    const mount = document.querySelector('.mount')!;
    markContainer(mount);
    attachFiber(mount.querySelector('b')!, createFiber(source('/app/src/Widget.tsx', 3)));

    expect(findReactContainers(document)).toEqual([mount]);
    expect(detectReact(document).hasSourceInfo).toBe(true);
  });
});

describe('hasSourceInChain', () => {
  it('walks the return chain', () => {
    const top = createFiber(source('/app/src/App.tsx', 2));
    const leaf = createFiber(null, createFiber(null, top));

    expect(hasSourceInChain(leaf)).toBe(true);
    expect(hasSourceInChain(createFiber(null, createFiber(null)))).toBe(false);
    expect(hasSourceInChain(null)).toBe(false);
  });

  it('treats an empty fileName as missing', () => {
    expect(hasSourceInChain(createFiber({ fileName: '', lineNumber: 1 }))).toBe(false);
  });
});
