import { useMemo } from 'react';

export const useIsLocalhost = (): boolean =>
  useMemo(() => {
    if (typeof window === 'undefined') return false;

    const { hostname } = window.location;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }, []);
