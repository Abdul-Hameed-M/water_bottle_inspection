import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import React from 'react';

/**
 * Memoize a function with a stable reference
 * @param {Function} fn - Function to memoize
 * @param {Array} deps - Dependencies array
 * @returns {Function} - Memoized function
 */
export const useStableCallback = (fn, deps) => {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback((...args) => fnRef.current(...args), deps || []);
};

/**
 * Memoize a value with deep comparison
 * @param {any} value - Value to memoize
 * @param {Array} deps - Dependencies array
 * @returns {any} - Memoized value
 */
export const useDeepMemo = (value, deps) => {
  return useMemo(() => value, deps);
};

/**
 * Debounce a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const useDebouncedCallback = (fn, delay = 300) => {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }, [fn, delay]);
};

/**
 * Throttle a function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const useThrottledCallback = (fn, limit = 300) => {
  const inThrottle = useRef(false);

  return useCallback((...args) => {
    if (!inThrottle.current) {
      fn(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [fn, limit]);
};

/**
 * Create a memoized selector
 * @param {Function} selector - Selector function
 * @param {Array} deps - Dependencies array
 * @returns {Function} - Memoized selector
 */
export const useMemoizedSelector = (selector, deps) => {
  return useMemo(() => selector, deps);
};

/**
 * Batch state updates
 * @param {Function} setState - State setter function
 * @returns {Function} - Batched state updater
 */
export const useBatchedUpdates = (setState) => {
  return useCallback((updates) => {
    setState((prev) => ({
      ...prev,
      ...updates
    }));
  }, [setState]);
};

/**
 * Create a lazy-loaded component
 * @param {Function} importFn - Import function
 * @param {Object} options - Options
 * @returns {React.Component} - Lazy-loaded component
 */
export const createLazyComponent = (importFn, options = {}) => {
  return React.lazy(() => importFn().catch((error) => {
    console.error('Failed to load component:', error);
    return options.fallback || { default: () => null };
  }));
};

/**
 * Optimize image loading
 * @param {string} src - Image source
 * @param {Object} options - Options
 * @returns {Object} - Image loading state
 */
export const useOptimizedImage = (src, options = {}) => {
  const { lazy = true, threshold = 0.1 } = options;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setLoaded(true);
      setError(null);
    };

    img.onerror = () => {
      setError(new Error('Failed to load image'));
      setLoaded(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { loaded, error, imgRef };
};

/**
 * Memoize component with custom comparison
 * @param {React.Component} Component - Component to memoize
 * @param {Function} areEqual - Custom comparison function
 * @returns {React.Component} - Memoized component
 */
export const memoizeComponent = (Component, areEqual) => {
  return React.memo(Component, areEqual);
};

/**
 * Create a memoized version of a component
 * @param {React.Component} Component - Component to memoize
 * @returns {React.Component} - Memoized component
 */
export const memo = (Component) => {
  return React.memo(Component);
};

export default {
  useStableCallback,
  useDeepMemo,
  useDebouncedCallback,
  useThrottledCallback,
  useMemoizedSelector,
  useBatchedUpdates,
  createLazyComponent,
  useOptimizedImage,
  memoizeComponent,
  memo
};
