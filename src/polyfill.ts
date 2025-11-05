import { Buffer } from 'buffer';
if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

// Polyfill process for browser
if (typeof globalThis !== 'undefined' && !globalThis.process) {
  globalThis.process = { env: {} } as any;
}
