const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add WASM support
config.resolver.assetExts.push('wasm');

module.exports = config;
