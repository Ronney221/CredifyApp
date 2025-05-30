const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure the shims directory exists or create it if necessary before resolving paths
const shimsDir = path.resolve(__dirname, 'shims');
// Consider adding a check here to ensure shimsDir and shims/empty.js exist

config.resolver.extraNodeModules = {
  // Browser-friendly polyfills for client-side Supabase operations
  stream: require.resolve('readable-stream'),
  crypto: require.resolve('react-native-crypto'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  url: require.resolve('react-native-url-polyfill'),
  buffer: require.resolve('buffer/'),
  events: require.resolve('events/'),
  process: require.resolve('process/browser'),
  util: require.resolve('util/'),
  zlib: require.resolve('browserify-zlib'),
  path: require.resolve('path-browserify'),

  // Shims for Node.js core modules not needed/usable in React Native client
  tls: path.resolve(shimsDir, 'empty.js'),
  net: path.resolve(shimsDir, 'empty.js'),
  dns: path.resolve(shimsDir, 'empty.js'),
  fs: path.resolve(shimsDir, 'empty.js'),
  child_process: path.resolve(shimsDir, 'empty.js'),
  constants: path.resolve(shimsDir, 'empty.js'),
};

module.exports = config; 