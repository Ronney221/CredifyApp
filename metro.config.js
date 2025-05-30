const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Minimal resolver configuration
config.resolver.alias = {
  'stream': 'readable-stream',
  'buffer': '@craftzdog/react-native-buffer',
};

module.exports = config; 