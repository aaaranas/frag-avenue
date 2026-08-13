// Vitest stub for the `server-only` package. In app code the real package
// throws at import time from client bundles; in tests we run pure server code
// under jsdom and just want the import to succeed.
export {};
