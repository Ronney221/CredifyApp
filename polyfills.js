/**
 * This file is used to load polyfills for the app.
 * It's important to import this file at the top of your entry file
 * to ensure the environment is correctly set up.
 */

// Polyfill for URL and URLSearchParams
import 'react-native-url-polyfill/auto';

// Add at the beginning of the file
if (typeof global.gc === 'function') {
  // Configure periodic garbage collection
  const GC_INTERVAL = 30000; // 30 seconds
  setInterval(() => {
    try {
      global.gc();
    } catch (e) {
      console.warn('Failed to run garbage collection:', e);
    }
  }, GC_INTERVAL);
}

// Initialize required globals
if (typeof global === 'undefined') {
  global = {};
}

// Buffer polyfill with error handling
try {
  if (!global.Buffer) {
    global.Buffer = require('buffer').Buffer;
  }
} catch (error) {
  console.warn('Failed to load Buffer polyfill:', error);
}

// Process polyfill with error handling
try {
  if (!global.process) {
    global.process = require('process');
  }
} catch (error) {
  console.warn('Failed to load process polyfill:', error);
}

// Directory and file path polyfills
if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';

// Network polyfills with error handling
try {
  if (!global.net) {
    global.net = {
      createConnection: () => null,
      Socket: function() {},
      connect: () => null,
    };
  }

  if (!global.tls) {
    global.tls = {
      TLSSocket: function() {},
      connect: () => null,
    };
  }

  if (!global.dgram) {
    global.dgram = {
      createSocket: () => null,
    };
  }
} catch (error) {
  console.warn('Failed to initialize network polyfills:', error);
}

// WebSocket polyfill with proper error handling
try {
  if (!global.WebSocket) {
    const ws = require('react-native-websocket').default;
    if (typeof ws === 'function') {
      global.WebSocket = ws;
    } else {
      throw new Error('Invalid WebSocket implementation');
    }
  }
} catch (error) {
  console.warn('Failed to load WebSocket polyfill:', error);
  // Fallback WebSocket implementation
  global.WebSocket = class MockWebSocket {
    constructor() {
      console.warn('Using mock WebSocket implementation');
    }
    close() {}
    send() {}
  };
} 