// custom fork of parser; see package.json
const { parse } = require('@babel/parser');

module.exports = {
  presets: [
    [
      '@babel/env',
      {
        targets: {
          edge: '17',
          firefox: '60',
          chrome: '67',
          safari: '11.1',
        },
      },
    ],
  ],
  plugins: [
    { parserOverride: (code, opts) => parse(code, opts) },
    // '@babel/plugin-proposal-class-properties',
    // '@babel/plugin-syntax-classes-1.1',
    '@babel/plugin-proposal-classes-1.1',
  ],
};
