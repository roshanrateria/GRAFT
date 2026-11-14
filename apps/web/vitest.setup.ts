/**
 * Vitest setup for jsdom tests
 *
 * jsdom lacks several browser APIs used by the Theatre UI components.
 */
import '@testing-library/jest-dom/vitest';

/**
 * window.matchMedia - used by components honoring prefers-reduced-motion
 * (TopBar, ConsentDialog, LaboratoryOverlay, RejectedStamp).
 */
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined, // deprecated
      removeListener: () => undefined, // deprecated
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

/**
 * ResizeObserver - used by responsive components.
 */
if (!window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}
