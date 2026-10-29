/**
 * Runtime configuration for the frontend.
 *
 * This file is served statically and runs in the browser, where `process.env`
 * does not exist. It must therefore only preserve values already injected by
 * the server-rendered runtime-config script (or by a container entrypoint that
 * replaces this file). Any values defined here act as local development
 * defaults.
 */
window.__RUNTIME_CONFIG__ = Object.assign(
  {
    // Internal API URL (used by SSR/server components)
    apiUrl: "http://api:3000",
    // Browser-facing API URL (used by client components, fetch calls)
    apiUrlBrowser: "http://localhost:3000",
  },
  window.__RUNTIME_CONFIG__ || {}
);
