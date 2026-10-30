// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'react-compiler/react-compiler': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
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
