// Shim for the 'monaco-editor' import inside monaco-vim.
// The page loads its own Monaco (window.monaco) asynchronously via
// @monaco-editor/loader, so instead of bundling a second copy we forward
// every property access to the page-global instance. The Proxy keeps the
// lookup lazy: window.monaco may not exist yet when this bundle first loads.
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      return window.monaco ? window.monaco[prop] : undefined;
    },
    has(_target, prop) {
      return !!window.monaco && prop in window.monaco;
    },
  }
);
