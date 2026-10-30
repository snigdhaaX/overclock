// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'backend/**/*',
      'blockchain/**/*',
      'TRUSTCHAIN_Basic_Framework/**/*',
      'node_modules/**/*',
    ],
  },
]);
