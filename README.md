# Babel Plugins for Classes 1.1

This repo contains two experimental plugins enabling support for the [classes 1.1](https://github.com/zenparsing/js-classes-1.1) proposal:

- babel-plugin-syntax-classes-1.1 (syntax plugin)
- babel-plugin-proposal-classes-1.1 (transform plugin)

> IMPORTANT NOTE: The classes 1.1 proposal is still evolving, and the syntax supported by these plugins might not always match what is documented at https://github.com/zenparsing/js-classes-1.1/blob/master/README.md.

## Usage

These plugins require a custom fork of babel's parser. First, install the desired parser version, for example:

```bash
yarn add -D @babel/parser github:mbrowne/babel#babel-parser-v7.1.3-classes1.1-0.0.2-gitpkg
```

(Note: In the future, the babe-parser packages might be published in the public npm repository, to avoid the need for a github URL.)

Your `babel.config.js` file will need to include the following:

```js
// custom fork of parser; see package.json
const { parse } = require('@babel/parser');

module.exports = {
  presets: [
    // your presets here, e.g. '@babel/env'
  ],
  plugins: [
    { parserOverride: (code, opts) => parse(code, opts) },
    '@babel/plugin-proposal-classes-1.1',
  ],
};
```

> Technical note: Explicitly specifying the `@babel/parser` module is necessary because otherwise Babel will use the official parser version. This is because `@babel/core` has a dependency on `@babel/parser` in its own `package.json`.
