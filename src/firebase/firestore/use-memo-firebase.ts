'use client';

import { useMemo, DependencyList } from 'react';

/**
 * A custom hook that memoizes a value and adds a hidden property to indicate
 * it was created via this hook. This is used by useCollection and useDoc
 * to ensure that the provided reference or query is stable and won't cause
 * infinite re-renders.
 *
 * @template T The type of the value to memoize.
 * @param {() => T} factory A function that returns the value to memoize.
 * @param {DependencyList} deps The dependencies for the memoization.
 * @returns {T & { __memo?: boolean }} The memoized value with an added __memo property.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T & { __memo?: boolean } {
  return useMemo(() => {
    const value = factory();
    if (value && typeof value === 'object') {
      (value as any).__memo = true;
    }
    return value as T & { __memo?: boolean };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
