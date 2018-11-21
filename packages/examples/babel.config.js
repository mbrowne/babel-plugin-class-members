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
    '@babel/proposal-class-members',

    // plugin-proposal-class-members is independent;
    // uncomment this only if you want to compare it with plugin-proposal-class-properties.
    // Note that they are not guaranteed to play well together if both are enabled.
    // '@babel/plugin-proposal-class-properties',
  ],
};
