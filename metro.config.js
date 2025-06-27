const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Ensure shims directory exists
const shimsDir = path.resolve(__dirname, 'shims');
if (!fs.existsSync(shimsDir)) {
  fs.mkdirSync(shimsDir, { recursive: true });
}

// Create empty shim if it doesn't exist
const emptyShimPath = path.resolve(shimsDir, 'empty.js');
if (!fs.existsSync(emptyShimPath)) {
  fs.writeFileSync(emptyShimPath, 'module.exports = {};');
}

const config = getDefaultConfig(__dirname);

// Add error handling for resolver
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    return originalResolver(context, moduleName, platform);
  } catch (error) {
    console.warn(`Failed to resolve ${moduleName}:`, error);
    // Return empty module for unresolvable requests
    return {
      type: 'empty',
      filePath: emptyShimPath,
    };
  }
};

// Safe polyfills configuration
const polyfills = {
  stream: 'readable-stream',
  crypto: 'react-native-crypto',
  http: 'stream-http',
  https: 'https-browserify',
  url: 'react-native-url-polyfill',
  buffer: 'buffer/',
  events: 'events/',
  process: 'process/browser',
  util: 'util/',
  zlib: 'browserify-zlib',
  path: 'path-browserify',
};

// Node.js core modules to shim
const nodeShims = [
  'tls',
  'net',
  'dns',
  'fs',
  'child_process',
  'constants',
];

// Safely resolve polyfills
config.resolver.extraNodeModules = {};

// Add polyfills with error handling
Object.entries(polyfills).forEach(([key, value]) => {
  try {
    config.resolver.extraNodeModules[key] = require.resolve(value);
  } catch (error) {
    console.warn(`Failed to resolve polyfill for ${key}:`, error);
    config.resolver.extraNodeModules[key] = emptyShimPath;
  }
});

// Add node shims
nodeShims.forEach(module => {
  config.resolver.extraNodeModules[module] = emptyShimPath;
});

module.exports = config; 